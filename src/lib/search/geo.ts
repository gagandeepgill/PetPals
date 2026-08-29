import type { SearchFilter } from "../domain/search";

/** Great-circle distance in miles (matches Postgres' geography math closely
 *  enough for radius filtering at city scale). */
export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}

/** The "Near me" origin, when the filter carries one. */
export function filterOrigin(filter: SearchFilter): { lat: number; lon: number } | null {
  return filter.lat !== undefined && filter.lon !== undefined
    ? { lat: filter.lat, lon: filter.lon }
    : null;
}
