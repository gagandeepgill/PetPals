import type { AdapterCtx, FetchWindow, RawListing, SourceAdapter } from "../types";
import { RawListingSchema } from "../types";

/**
 * Animal Shelter Manager (sheltermanager.com) service API — the documented
 * public embed feed (`animal_view_adoptable_js`) shelters publish on their own
 * sites. One generic adapter unlocks every ASM org; accounts are config, not
 * code: ASM3_ACCOUNTS="ja0095:Some Shelter Name,ab1234:Another Shelter".
 *
 * One request per account per sync; images are hotlinked to the service API
 * exactly as ASM's own widget does (that is the licensed usage).
 */

const SERVICE_BASE = "https://service.sheltermanager.com/asmservice";

interface AsmAnimal {
  ID: number;
  ANIMALNAME?: string;
  SPECIESNAME?: string;
  BREEDNAME?: string;
  BREEDNAME1?: string;
  BREEDNAME2?: string;
  CROSSBREED?: number;
  SEXNAME?: string;
  SIZENAME?: string;
  AGEGROUP?: string;
  DATEOFBIRTH?: string;
  SHELTERCODE?: string;
  WEBSITEMEDIANOTES?: string;
  ANIMALCOMMENTS?: string;
  WEBSITEIMAGECOUNT?: number;
  RESERVATIONDATE?: string | null;
  MOSTRECENTENTRYDATE?: string;
  ISGOODWITHCATSNAME?: string;
  ISGOODWITHDOGSNAME?: string;
  ISGOODWITHCHILDRENNAME?: string;
  ISHOUSETRAINEDNAME?: string;
  NEUTEREDNAME?: string;
}

const SPECIES_MAP: Record<string, RawListing["species"]> = {
  dog: "dog",
  cat: "cat",
  rabbit: "rabbit",
  bird: "bird",
  "guinea pig": "small_furry",
  hamster: "small_furry",
  rat: "small_furry",
  mouse: "small_furry",
  ferret: "small_furry",
  reptile: "reptile",
  snake: "reptile",
  lizard: "reptile",
  tortoise: "reptile",
  horse: "horse",
  pony: "horse",
  goat: "barnyard",
  pig: "barnyard",
};

const SIZE_MAP: Record<string, NonNullable<RawListing["size"]>> = {
  "very small": "xs",
  small: "s",
  medium: "m",
  large: "l",
  "very large": "xl",
  "x-large": "xl",
};

const AGE_MAP: Record<string, NonNullable<RawListing["age"]>> = {
  baby: "baby",
  puppy: "baby",
  kitten: "baby",
  young: "young",
  "young adult": "young",
  adult: "adult",
  senior: "senior",
  aged: "senior",
};

/** ASM "good with" labels: Yes/No/Unknown plus selective values like
 *  "Over 12" — anything selective stays unmapped (tri-state unknown). */
function triBool(label: string | undefined): boolean | undefined {
  const v = (label ?? "").trim().toLowerCase();
  if (v === "yes") return true;
  if (v === "no") return false;
  return undefined;
}

function ageFromDob(dob: string | undefined): RawListing["age"] {
  if (!dob) return undefined;
  const t = Date.parse(dob);
  if (Number.isNaN(t)) return undefined;
  const months = (Date.now() - t) / (30.44 * 24 * 3_600_000);
  if (months < 6) return "baby";
  if (months < 24) return "young";
  if (months < 96) return "adult";
  return "senior";
}

function imageUrls(account: string, animal: AsmAnimal): string[] {
  const count = Math.min(Math.max(animal.WEBSITEIMAGECOUNT ?? 0, 0), 6);
  return Array.from(
    { length: count },
    (_, i) =>
      `${SERVICE_BASE}?account=${encodeURIComponent(account)}&method=animal_image&animalid=${animal.ID}&seq=${i + 1}`,
  );
}

function toIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

export function parseAdoptablesJs(source: string): AsmAnimal[] {
  const marker = "adoptables = ";
  const start = source.indexOf(marker);
  if (start === -1) throw new Error("adoptables payload not found in service response");
  const from = start + marker.length;
  const end = source.indexOf("];", from);
  if (end === -1) throw new Error("adoptables payload not terminated");
  return JSON.parse(source.slice(from, end + 1)) as AsmAnimal[];
}

export function mapAsmAnimal(
  account: string,
  orgName: string,
  animal: AsmAnimal,
): RawListing | null {
  const speciesName = (animal.SPECIESNAME ?? "").trim().toLowerCase();
  const breeds = animal.CROSSBREED
    ? { primary: animal.BREEDNAME1 || animal.BREEDNAME, secondary: animal.BREEDNAME2 || undefined, mixed: true }
    : { primary: animal.BREEDNAME, mixed: false };

  const kids = triBool(animal.ISGOODWITHCHILDRENNAME);
  const cats = triBool(animal.ISGOODWITHCATSNAME);
  const dogs = triBool(animal.ISGOODWITHDOGSNAME);
  const house = triBool(animal.ISHOUSETRAINEDNAME);
  const altered = triBool(animal.NEUTEREDNAME);

  const candidate = {
    externalId: String(animal.ID),
    sourceId: `asm3:${account}`,
    url: `${SERVICE_BASE}?account=${encodeURIComponent(account)}&method=animal_view&animalid=${animal.ID}`,
    name: (animal.ANIMALNAME ?? "").trim() || "Unknown",
    species: SPECIES_MAP[speciesName] ?? "other",
    breeds,
    age:
      AGE_MAP[(animal.AGEGROUP ?? "").trim().toLowerCase()] ?? ageFromDob(animal.DATEOFBIRTH),
    sex:
      animal.SEXNAME?.toLowerCase() === "male"
        ? "male"
        : animal.SEXNAME?.toLowerCase() === "female"
          ? "female"
          : "unknown",
    size: SIZE_MAP[(animal.SIZENAME ?? "").trim().toLowerCase()],
    description: (animal.WEBSITEMEDIANOTES || animal.ANIMALCOMMENTS || "").trim() || undefined,
    photos: imageUrls(account, animal),
    status: animal.RESERVATIONDATE ? "pending" : "available",
    location: {},
    organization: { externalOrgId: account, name: orgName },
    orgInternalAnimalId: animal.SHELTERCODE || undefined,
    attributes: {
      ...(kids !== undefined ? { kidsOk: kids } : {}),
      ...(cats !== undefined ? { catsOk: cats } : {}),
      ...(dogs !== undefined ? { dogsOk: dogs } : {}),
      ...(house !== undefined ? { housetrained: house } : {}),
      ...(altered !== undefined ? { altered } : {}),
    },
    tags: [],
    publishedAt: toIso(animal.MOSTRECENTENTRYDATE),
    raw: animal,
  };

  const parsed = RawListingSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function makeAsm3Adapter(account: string, orgName: string): SourceAdapter {
  return {
    sourceId: `asm3:${account}`,
    kind: "widget",
    schedule: { intervalMs: 12 * 3_600_000 },
    politeness: { maxConcurrent: 1, minDelayMs: 2000 },

    async healthcheck() {
      const res = await fetch(
        `${SERVICE_BASE}?account=${encodeURIComponent(account)}&method=animal_view_adoptable_js`,
        { method: "HEAD", headers: { "User-Agent": "PetPalsBot/1.0 (+https://petpals.app/bot)" } },
      );
      return res.ok ? { ok: true } : { ok: false, detail: `HTTP ${res.status}` };
    },

    async *fetchListings(_window: FetchWindow, ctx: AdapterCtx): AsyncIterable<RawListing> {
      const res = await fetch(
        `${SERVICE_BASE}?account=${encodeURIComponent(account)}&method=animal_view_adoptable_js`,
        { headers: { "User-Agent": "PetPalsBot/1.0 (+https://petpals.app/bot)" } },
      );
      if (!res.ok) throw new Error(`asm3:${account} HTTP ${res.status}`);
      const body = await res.text();
      if (body.startsWith("ERROR:")) throw new Error(`asm3:${account} ${body.slice(0, 80)}`);

      const animals = parseAdoptablesJs(body);
      let skipped = 0;
      for (const animal of animals) {
        const listing = mapAsmAnimal(account, orgName, animal);
        if (listing) {
          yield listing;
        } else {
          skipped++;
          await ctx.quarantine?.(animal, "failed RawListing schema validation");
        }
      }
      ctx.log(`asm3:${account} yielded ${animals.length - skipped}/${animals.length}`);
    },
  };
}

/** Parse ASM3_ACCOUNTS="acct[:Display Name],acct2[:Name2]". */
export function asm3AdaptersFromEnv(value: string | undefined): SourceAdapter[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [account, ...nameParts] = entry.split(":");
      return makeAsm3Adapter(account!.trim(), nameParts.join(":").trim() || `Shelter ${account!.trim()}`);
    });
}
