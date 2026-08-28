import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pet } from "../domain/pet";
import {
  parseBbox,
  type PetCardData,
  type SearchFilter,
  type SearchResponse,
} from "../domain/search";
import type { SearchProvider } from "./provider";

/**
 * Serves data/live-snapshot.json (written by `npm run snapshot`) — REAL
 * listings from configured sources, no database required. Sits between the
 * Postgres provider and the built-in demo seeds in the provider chain.
 */

export interface SnapshotPet {
  pet: Pet;
  card: PetCardData;
}

export interface SnapshotFile {
  generatedAt: string;
  sources: string[];
  pets: SnapshotPet[];
}

const SNAPSHOT_PATH = join(process.cwd(), "data", "live-snapshot.json");

let cache: SnapshotFile | null | undefined;

function loadSnapshot(): SnapshotFile | null {
  if (cache !== undefined) return cache;
  try {
    cache = existsSync(SNAPSHOT_PATH)
      ? (JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as SnapshotFile)
      : null;
  } catch {
    cache = null;
  }
  return cache;
}

export function hasSnapshot(): boolean {
  return loadSnapshot() !== null && (loadSnapshot()?.pets.length ?? 0) > 0;
}

function matches(entry: SnapshotPet, filter: SearchFilter): boolean {
  const { pet } = entry;
  if (pet.status !== "available" && pet.status !== "pending") return false;
  if (filter.species && pet.species !== filter.species) return false;
  if (filter.ageGroup?.length && !filter.ageGroup.includes(pet.age.group as never)) return false;
  if (filter.sex && pet.sex !== filter.sex) return false;
  if (filter.size?.length && !filter.size.includes(pet.size as never)) return false;
  if (
    filter.breed &&
    !pet.breed.rawBreedText.toLowerCase().includes(filter.breed.toLowerCase())
  ) {
    return false;
  }
  if (filter.energy?.length && !filter.energy.includes(pet.energyLevel as never)) return false;
  if (filter.houseTrained !== undefined && pet.houseTrained !== filter.houseTrained) return false;
  const allowed: unknown[] = filter.includeUnknownCompat ? [true, "unknown"] : [true];
  for (const target of filter.goodWith ?? []) {
    if (!allowed.includes(pet.compat[target])) return false;
  }
  const box = parseBbox(filter.bbox);
  if (box) {
    const { lat, lon } = pet.location;
    if (
      (lat === 0 && lon === 0) ||
      lon < box.minLon ||
      lon > box.maxLon ||
      lat < box.minLat ||
      lat > box.maxLat
    ) {
      return false;
    }
  }
  return true;
}

export const snapshotProvider: SearchProvider = {
  async searchPets(filter: SearchFilter): Promise<SearchResponse> {
    const snapshot = loadSnapshot();
    const filtered = (snapshot?.pets ?? [])
      .filter((p) => matches(p, filter))
      .sort((a, b) => b.card.listedAt.localeCompare(a.card.listedAt));

    const offset = filter.cursor ? Number.parseInt(filter.cursor, 10) || 0 : 0;
    const page = filtered.slice(offset, offset + filter.limit);
    const nextOffset = offset + filter.limit;

    const facet = (key: (p: SnapshotPet) => string) =>
      filtered.reduce<Record<string, number>>((acc, p) => {
        acc[key(p)] = (acc[key(p)] ?? 0) + 1;
        return acc;
      }, {});

    return {
      results: page.map((p) => p.card),
      facets: {
        species: facet((p) => p.pet.species),
        ageGroup: facet((p) => p.pet.age.group),
      },
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
      total: filtered.length,
    };
  },

  async getPetById(id: string): Promise<Pet | null> {
    const snapshot = loadSnapshot();
    return snapshot?.pets.find((p) => p.pet.id === id)?.pet ?? null;
  },

  async getFeatured(limit: number): Promise<PetCardData[]> {
    const snapshot = loadSnapshot();
    return (snapshot?.pets ?? [])
      .filter((p) => p.pet.status === "available")
      .sort((a, b) => b.card.listedAt.localeCompare(a.card.listedAt))
      .slice(0, limit)
      .map((p) => p.card);
  },
};
