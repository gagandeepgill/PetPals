/**
 * Canonical domain model. A Pet is a derived projection over 1..n immutable
 * SourceListings — nothing here is hand-authored except moderator overrides.
 */

export type TriState = true | false | "unknown";

export const SPECIES = [
  "dog",
  "cat",
  "rabbit",
  "bird",
  "small_furry",
  "reptile",
  "horse",
  "barnyard",
  "other",
] as const;
export type Species = (typeof SPECIES)[number];

export type Sex = "male" | "female" | "unknown";

export const SIZES = ["xs", "s", "m", "l", "xl", "unknown"] as const;
export type Size = (typeof SIZES)[number];

export const AGE_GROUPS = ["baby", "young", "adult", "senior", "unknown"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const COAT_LENGTHS = [
  "hairless",
  "short",
  "medium",
  "long",
  "wire",
  "curly",
  "unknown",
] as const;
export type CoatLength = (typeof COAT_LENGTHS)[number];

export const ENERGY_LEVELS = ["low", "moderate", "high", "very_high", "unknown"] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export type PetStatus = "available" | "pending" | "adopted" | "removed" | "unknown";

export type SourceSystem =
  | "rescuegroups"
  | "asm3"
  | "shelterluv"
  | "petango"
  | "scrape"
  | "petfinder";

export interface AgeEstimate {
  group: AgeGroup;
  /** DOB stored as a range, never a point — stays correct as time passes. */
  estimatedDobStart: string | null;
  estimatedDobEnd: string | null;
  confidence: "exact" | "stated_age" | "inferred_from_group" | "unknown";
}

export interface PetPhoto {
  id: string;
  sourceListingId: string;
  url: string;
  originalUrl: string;
  width: number | null;
  height: number | null;
  /** 64-bit perceptual hash (hex) — dedup signal. Empty until M1. */
  phash: string;
  /** ~20px base64 placeholder computed at ingestion for next/image. */
  blurDataURL: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Pet {
  /** Internal UUID — never a source ID. */
  id: string;
  species: Species;
  name: string;
  breed: {
    primaryBreedId: string | null;
    secondaryBreedId: string | null;
    isMixed: boolean;
    rawBreedText: string;
  };
  sex: Sex;
  size: Size;
  age: AgeEstimate;
  coatLength: CoatLength;
  colors: string[];
  energyLevel: EnergyLevel;
  houseTrained: TriState;
  spayedNeutered: TriState;
  specialNeeds: TriState;
  specialNeedsDescription: string | null;
  /** Tri-state: absence of a source tag is NOT evidence of absence. */
  compat: { kids: TriState; dogs: TriState; cats: TriState };
  /** Unmappable source tags, kept verbatim — never dropped. */
  traits: string[];
  description: string | null;
  status: PetStatus;
  statusComputedAt: string;
  organizationId: string;
  organizationName: string;
  sourceLabel: string;
  sourceUrl: string | null;
  location: { lat: number; lon: number; postalCode: string | null; city: string | null; state: string | null };
  photos: PetPhoto[];
  sourceListingIds: string[];
  adoptionFee: { amountCents: number; currency: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: { city: string | null; state: string | null; postalCode: string | null; country: string };
  location: { lat: number; lon: number } | null;
  verified501c3: boolean;
  partnerTier: "none" | "claimed" | "partner";
  sourceRefs: { source: SourceSystem; externalOrgId: string }[];
}
