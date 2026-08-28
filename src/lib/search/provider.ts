import type { Pet } from "../domain/pet";
import type { PetCardData, SearchFilter, SearchResponse } from "../domain/search";

/**
 * The swap seam between Postgres-native search (phase 1) and a dedicated
 * engine (Typesense, phase 2 — gated on faceted-search p95 > 150ms). The app
 * only ever talks to this interface.
 */
export interface SearchProvider {
  searchPets(filter: SearchFilter): Promise<SearchResponse>;
  getPetById(id: string): Promise<Pet | null>;
  getFeatured(limit: number): Promise<PetCardData[]>;
}

export function ageLabel(group: string): string {
  switch (group) {
    case "baby":
      return "Baby";
    case "young":
      return "Young";
    case "adult":
      return "Adult";
    case "senior":
      return "Senior";
    default:
      return "Age unknown";
  }
}

export function photoAlt(name: string, ageGroup: string, breedLabel: string): string {
  return `${name}, a ${ageLabel(ageGroup).toLowerCase()} ${breedLabel}`;
}
