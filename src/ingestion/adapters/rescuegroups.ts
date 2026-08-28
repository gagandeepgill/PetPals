import type { AdapterCtx, FetchWindow, RawListing, SourceAdapter } from "../types";
import { RawListingSchema } from "../types";

const API_BASE = "https://api.rescuegroups.org/v5/public";
const PAGE_LIMIT = 250; // documented maximum results per request

/**
 * RescueGroups.org API v5 — the primary structured source (Petfinder's public
 * API was sunset 2025-12-02). Terms: refresh at least weekly (we run daily),
 * no re-syndication, delete on termination.
 *
 * JSON:API responses; field names vary by species module, so mapping is
 * deliberately defensive — unknown shapes degrade to skipped listings, never
 * crashes.
 */

interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string } | { id: string }[] }>;
}

interface JsonApiPage {
  data?: JsonApiResource[];
  included?: JsonApiResource[];
  meta?: { pageReturned?: number; pages?: number };
}

const SPECIES_MAP: Record<string, RawListing["species"]> = {
  dog: "dog",
  cat: "cat",
  rabbit: "rabbit",
  bird: "bird",
  "small animal": "small_furry",
  reptile: "reptile",
  horse: "horse",
  "farm animal": "barnyard",
};

const AGE_MAP: Record<string, NonNullable<RawListing["age"]>> = {
  baby: "baby",
  young: "young",
  adult: "adult",
  senior: "senior",
};

const SIZE_MAP: Record<string, NonNullable<RawListing["size"]>> = {
  small: "s",
  medium: "m",
  large: "l",
  "x-large": "xl",
};

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function relIds(resource: JsonApiResource, key: string): string[] {
  const data = resource.relationships?.[key]?.data;
  if (!data) return [];
  return Array.isArray(data) ? data.map((d) => d.id) : [data.id];
}

function mapAnimal(
  animal: JsonApiResource,
  included: Map<string, JsonApiResource>,
): RawListing | null {
  const a = animal.attributes ?? {};

  const speciesName = str(a.speciesName)?.toLowerCase() ?? "";
  const species = SPECIES_MAP[speciesName] ?? "other";

  const orgId = relIds(animal, "orgs")[0];
  if (!orgId) return null;
  const org = included.get(`orgs:${orgId}`);

  const photos = relIds(animal, "pictures")
    .map((id) => included.get(`pictures:${id}`))
    .map((pic) => {
      const large = pic?.attributes?.large as { url?: string } | undefined;
      return str(large?.url) ?? str(pic?.attributes?.url);
    })
    .filter((url): url is string => Boolean(url));

  const candidate = {
    externalId: animal.id,
    sourceId: "rescuegroups",
    url: str(a.url),
    name: str(a.name) ?? "Unknown",
    species,
    breeds: {
      primary: str(a.breedPrimary),
      secondary: str(a.breedSecondary),
      mixed: typeof a.isBreedMixed === "boolean" ? a.isBreedMixed : undefined,
    },
    age: AGE_MAP[str(a.ageGroup)?.toLowerCase() ?? ""],
    sex: str(a.sex)?.toLowerCase() === "male" ? "male" : str(a.sex)?.toLowerCase() === "female" ? "female" : "unknown",
    size: SIZE_MAP[str(a.sizeGroup)?.toLowerCase() ?? ""],
    description: str(a.descriptionText),
    photos,
    status: "available",
    location: {
      city: str(org?.attributes?.city),
      state: str(org?.attributes?.state),
      postcode: str(org?.attributes?.postalcode),
      lat: typeof org?.attributes?.lat === "number" ? org.attributes.lat : undefined,
      lon: typeof org?.attributes?.lon === "number" ? org.attributes.lon : undefined,
    },
    organization: { externalOrgId: orgId, name: str(org?.attributes?.name) },
    orgInternalAnimalId: str(a.animalID) ?? str(a.rescueId),
    attributes: {
      ...(typeof a.isHousetrained === "boolean" ? { housetrained: a.isHousetrained } : {}),
      ...(typeof a.isAltered === "boolean" ? { altered: a.isAltered } : {}),
      ...(typeof a.isKidsOk === "boolean" ? { kidsOk: a.isKidsOk } : {}),
      ...(typeof a.isDogsOk === "boolean" ? { dogsOk: a.isDogsOk } : {}),
      ...(typeof a.isCatsOk === "boolean" ? { catsOk: a.isCatsOk } : {}),
    },
    tags: Array.isArray(a.qualities) ? a.qualities.filter((q) => typeof q === "string") : [],
    publishedAt: str(a.createdDate),
    raw: animal,
  };

  const parsed = RawListingSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export const rescueGroupsAdapter: SourceAdapter = {
  sourceId: "rescuegroups",
  kind: "api",
  politeness: { maxConcurrent: 1, minDelayMs: 1000 },

  async healthcheck(ctx: AdapterCtx) {
    const res = await fetch(`${API_BASE}/animals/search/available?limit=1`, {
      method: "GET",
      headers: {
        Authorization: ctx.secrets("RESCUEGROUPS_API_KEY"),
        "Content-Type": "application/vnd.api+json",
      },
    });
    return res.ok ? { ok: true } : { ok: false, detail: `HTTP ${res.status}` };
  },

  async *fetchListings(_window: FetchWindow, ctx: AdapterCtx): AsyncIterable<RawListing> {
    const apiKey = ctx.secrets("RESCUEGROUPS_API_KEY");
    let page = 1;
    let totalPages = 1;
    let skipped = 0;

    while (page <= totalPages) {
      const url = `${API_BASE}/animals/search/available?limit=${PAGE_LIMIT}&page=${page}&include=orgs,pictures`;
      const res = await fetch(url, {
        headers: { Authorization: apiKey, "Content-Type": "application/vnd.api+json" },
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") ?? "30");
        ctx.log(`429 from RescueGroups, backing off ${retryAfter}s`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      if (!res.ok) throw new Error(`RescueGroups HTTP ${res.status} on page ${page}`);

      const body = (await res.json()) as JsonApiPage;
      const included = new Map(
        (body.included ?? []).map((r) => [`${r.type}:${r.id}`, r] as const),
      );

      for (const animal of body.data ?? []) {
        const listing = mapAnimal(animal, included);
        if (listing) yield listing;
        else skipped++;
      }

      totalPages = body.meta?.pages ?? page;
      ctx.log(`rescuegroups page ${page}/${totalPages} (${skipped} skipped so far)`);
      page++;
      await new Promise((r) => setTimeout(r, this.politeness.minDelayMs));
    }
  },
};
