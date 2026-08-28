import type { TriState } from "../lib/domain/pet";
import type { RawListing } from "./types";

export const NORMALIZER_VERSION = 1;

/**
 * Normalizer v1: pure function of (RawListing) -> canonical pet fields.
 * Deterministic and replayable — raw payloads are immutable, so bumping
 * NORMALIZER_VERSION and re-running reprocesses history.
 *
 * v1 maps adapter-level attributes plus a small built-in tag table. The
 * attribute_mappings DB table takes over as the source of truth in M1.
 */

export interface NormalizedPet {
  species: string;
  name: string;
  rawBreedText: string;
  isMixed: boolean;
  sex: string;
  size: string;
  ageGroup: string;
  ageConfidence: string;
  houseTrained: TriState;
  spayedNeutered: TriState;
  compat: { kids: TriState; dogs: TriState; cats: TriState };
  traits: string[];
  description: string | null;
  status: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  lat: number | null;
  lon: number | null;
  sourceUrl: string | null;
  photos: string[];
}

type TagRule = { field: "compat.kids" | "compat.dogs" | "compat.cats" | "houseTrained"; value: boolean };

const TAG_RULES: Record<string, TagRule> = {
  "good with kids": { field: "compat.kids", value: true },
  "kid-friendly": { field: "compat.kids", value: true },
  "kid friendly": { field: "compat.kids", value: true },
  "children ok": { field: "compat.kids", value: true },
  "no small children": { field: "compat.kids", value: false },
  "good with dogs": { field: "compat.dogs", value: true },
  "no dogs": { field: "compat.dogs", value: false },
  "good with cats": { field: "compat.cats", value: true },
  "no cats": { field: "compat.cats", value: false },
  housebroken: { field: "houseTrained", value: true },
  "house trained": { field: "houseTrained", value: true },
  "house-trained": { field: "houseTrained", value: true },
};

function normalizeKey(tag: string): string {
  return tag.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim();
}

function tri(value: boolean | undefined): TriState {
  return value === undefined ? "unknown" : value;
}

export function normalizeListing(listing: RawListing): NormalizedPet {
  const compat = {
    kids: tri(listing.attributes.kidsOk as boolean | undefined),
    dogs: tri(listing.attributes.dogsOk as boolean | undefined),
    cats: tri(listing.attributes.catsOk as boolean | undefined),
  };
  let houseTrained = tri(listing.attributes.housetrained as boolean | undefined);
  const traits: string[] = [];

  for (const rawTag of listing.tags) {
    const rule = TAG_RULES[normalizeKey(rawTag)];
    if (!rule) {
      traits.push(rawTag.trim());
      continue;
    }
    // A tag never downgrades an explicit adapter attribute, only fills unknowns.
    if (rule.field === "houseTrained") {
      if (houseTrained === "unknown") houseTrained = rule.value;
    } else {
      const key = rule.field.split(".")[1] as keyof typeof compat;
      if (compat[key] === "unknown") compat[key] = rule.value;
    }
  }

  const breedParts = [listing.breeds.primary, listing.breeds.secondary].filter(Boolean);
  const isMixed =
    listing.breeds.mixed ??
    (breedParts.length > 1 || /mix|cross/i.test(listing.breeds.primary ?? ""));

  return {
    species: listing.species,
    name: listing.name.trim(),
    rawBreedText: breedParts.join(" / "),
    isMixed,
    sex: listing.sex ?? "unknown",
    size: listing.size ?? "unknown",
    ageGroup: listing.age ?? "unknown",
    ageConfidence: listing.age ? "inferred_from_group" : "unknown",
    houseTrained,
    spayedNeutered: tri(listing.attributes.altered as boolean | undefined),
    compat,
    traits,
    description: listing.description ?? null,
    status: listing.status,
    city: listing.location.city ?? null,
    state: listing.location.state ?? null,
    postalCode: listing.location.postcode ?? null,
    lat: listing.location.lat ?? null,
    lon: listing.location.lon ?? null,
    sourceUrl: listing.url ?? null,
    photos: listing.photos,
  };
}
