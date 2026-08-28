import type { SearchFilter } from "./domain/search";

/**
 * The normalized (defaults-stripped, key-sorted, cursor-free) filter object IS
 * the query key — the server prefetch and the client useInfiniteQuery must
 * produce identical keys from the same URL.
 */
export function normalizeFilters(filter: SearchFilter): Record<string, unknown> {
  const { cursor: _cursor, ...rest } = filter;
  const entries = Object.entries(rest)
    .filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0))
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

export const petKeys = {
  search: (filter: SearchFilter) => ["pets", "search", normalizeFilters(filter)] as const,
  detail: (id: string) => ["pets", "detail", id] as const,
};

export function filterToParams(filter: SearchFilter, cursor: string | null): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeFilters(filter))) {
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  if (cursor) params.set("cursor", cursor);
  return params;
}
