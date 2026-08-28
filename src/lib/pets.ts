import { unstable_cache } from "next/cache";
import { hasDatabase } from "./db";
import type { Pet } from "./domain/pet";
import { SearchFilterSchema } from "./domain/search";
import type { PetCardData, SearchFilter, SearchResponse } from "./domain/search";
import { demoProvider } from "./search/demo-provider";
import { pgProvider } from "./search/pg-provider";
import type { SearchProvider } from "./search/provider";

function provider(): SearchProvider {
  return hasDatabase() ? pgProvider : demoProvider;
}

export function searchPets(filter: SearchFilter): Promise<SearchResponse> {
  return provider().searchPets(filter);
}

/**
 * Tag-cached: the ingestion pipeline POSTs /api/revalidate the moment a pet's
 * status flips, so adopted pets update in seconds; the 24h revalidate window
 * is only a safety net.
 */
export function getPetById(id: string): Promise<Pet | null> {
  return unstable_cache(() => provider().getPetById(id), ["pet-by-id", id], {
    tags: ["pets", `pet:${id}`],
    revalidate: 86400,
  })();
}

export function getFeaturedPets(limit = 8): Promise<PetCardData[]> {
  return unstable_cache(() => provider().getFeatured(limit), ["featured-pets", String(limit)], {
    tags: ["pets", "pets:featured"],
    revalidate: 3600,
  })();
}

export interface HeroStats {
  total: number;
  faces: PetCardData[];
}

/**
 * Live-data hero: a real number and real faces in first paint. ~15min staleness
 * is fine — the number needs to be real, not real-time.
 */
export function getHeroStats(): Promise<HeroStats> {
  return unstable_cache(
    async () => {
      const response = await provider().searchPets(SearchFilterSchema.parse({ limit: 5 }));
      return { total: response.total, faces: response.results.slice(0, 4) };
    },
    ["hero-stats"],
    { tags: ["pets"], revalidate: 900 },
  )();
}
