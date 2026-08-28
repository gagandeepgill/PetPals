import type { SearchResponse } from "./domain/search";

/** Shared by the grid and the map — same query key, same fetcher, one cache entry. */
export async function fetchSearchPage(params: URLSearchParams): Promise<SearchResponse> {
  const res = await fetch(`/api/pets?${params.toString()}`);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return res.json() as Promise<SearchResponse>;
}
