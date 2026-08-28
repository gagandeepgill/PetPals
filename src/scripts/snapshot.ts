import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ADAPTERS } from "../ingestion/adapters";
import { normalizeListing } from "../ingestion/normalize";
import type { AdapterCtx, RawListing } from "../ingestion/types";
import type { Pet } from "../lib/domain/pet";
import type { PetCardData } from "../lib/domain/search";
import { ageLabel, photoAlt } from "../lib/search/provider";
import type { SnapshotFile, SnapshotPet } from "../lib/search/snapshot-provider";

/**
 * `npm run snapshot` — populate the app with REAL listings without a database:
 * runs every configured adapter (ones missing secrets are skipped with a
 * note), normalizes, and writes data/live-snapshot.json, which the search
 * provider chain prefers over the built-in demo seeds. A dev/demo bridge —
 * the database pipeline remains the real architecture.
 */

const ctx: AdapterCtx = {
  secrets: (key) => {
    const value = process.env[key];
    if (!value) throw new Error(`missing ${key}`);
    return value;
  },
  log: (message) => console.log(`[snapshot] ${message}`),
  quarantine: async (_raw, reason) => {
    console.warn(`[snapshot] quarantined a payload: ${reason}`);
  },
};

function slugId(listing: RawListing): string {
  return `${listing.sourceId}-${listing.externalId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function toSnapshotPet(listing: RawListing): SnapshotPet {
  const n = normalizeListing(listing);
  const now = listing.publishedAt ?? new Date().toISOString();
  const id = slugId(listing);
  const breedLabel = n.rawBreedText || (n.isMixed ? "Mixed breed" : "Breed unknown");
  const sourceLabel = listing.sourceId.startsWith("asm3")
    ? "sheltermanager.com"
    : listing.sourceId;

  const pet: Pet = {
    id,
    species: n.species as Pet["species"],
    name: n.name,
    breed: {
      primaryBreedId: null,
      secondaryBreedId: null,
      isMixed: n.isMixed,
      rawBreedText: n.rawBreedText,
    },
    sex: n.sex as Pet["sex"],
    size: n.size as Pet["size"],
    age: {
      group: n.ageGroup as Pet["age"]["group"],
      estimatedDobStart: null,
      estimatedDobEnd: null,
      confidence: n.ageConfidence as Pet["age"]["confidence"],
    },
    coatLength: "unknown",
    colors: [],
    energyLevel: "unknown",
    houseTrained: n.houseTrained,
    spayedNeutered: n.spayedNeutered,
    specialNeeds: "unknown",
    specialNeedsDescription: null,
    compat: n.compat,
    traits: n.traits,
    description: n.description,
    status: n.status as Pet["status"],
    statusComputedAt: now,
    organizationId: `snap-org-${listing.organization.externalOrgId}`,
    organizationName: listing.organization.name ?? "Shelter",
    sourceLabel,
    sourceUrl: n.sourceUrl,
    location: {
      lat: n.lat ?? 0,
      lon: n.lon ?? 0,
      postalCode: n.postalCode,
      city: n.city,
      state: n.state,
    },
    photos: n.photos.map((url, i) => ({
      id: `${id}-photo-${i}`,
      sourceListingId: `${id}-listing`,
      url,
      originalUrl: url,
      width: null,
      height: null,
      phash: "",
      blurDataURL: null,
      isPrimary: i === 0,
      sortOrder: i,
    })),
    sourceListingIds: [`${id}-listing`],
    adoptionFee: null,
    createdAt: now,
    updatedAt: now,
  };

  const card: PetCardData = {
    id,
    name: pet.name,
    species: pet.species as PetCardData["species"],
    ageGroup: pet.age.group,
    ageLabel: ageLabel(pet.age.group),
    breedLabel,
    distanceMi: null,
    city: pet.location.city,
    state: pet.location.state,
    orgName: pet.organizationName,
    sourceLabel,
    status: pet.status,
    listedAt: now,
    photo: pet.photos[0] ? { url: pet.photos[0].url, blurDataURL: null } : null,
    photoAlt: photoAlt(pet.name, pet.age.group, breedLabel),
    lat: n.lat,
    lon: n.lon,
  };

  return { pet, card };
}

async function main() {
  const pets: SnapshotPet[] = [];
  const sources: string[] = [];

  for (const adapter of ADAPTERS) {
    try {
      const health = await adapter.healthcheck(ctx);
      if (!health.ok) {
        console.warn(`[snapshot] skipping ${adapter.sourceId}: ${health.detail}`);
        continue;
      }
      let count = 0;
      for await (const listing of adapter.fetchListings({ full: true }, ctx)) {
        pets.push(toSnapshotPet(listing));
        count++;
      }
      sources.push(`${adapter.sourceId} (${count})`);
    } catch (err) {
      console.warn(`[snapshot] skipping ${adapter.sourceId}: ${String(err).slice(0, 120)}`);
    }
  }

  if (pets.length === 0) {
    console.error(
      "[snapshot] no listings collected — configure ASM3_ACCOUNTS and/or RESCUEGROUPS_API_KEY",
    );
    process.exit(1);
  }

  const file: SnapshotFile = {
    generatedAt: new Date().toISOString(),
    sources,
    pets,
  };
  const dir = join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "live-snapshot.json"), JSON.stringify(file));
  console.log(
    `[snapshot] wrote ${pets.length} pets from ${sources.join(", ")} to data/live-snapshot.json`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
