/**
 * Distance-unit selection (issue #24): Canadians think in km, the wire format
 * stays miles. Display-only — nothing here touches the search contract.
 *
 * The origin-country test is a piecewise-linear approximation of Canada's
 * southern border (a plain bounding box would put Seattle and Buffalo "in
 * Canada"). Good to a few km along the border, which is plenty for choosing
 * a display unit; known coarse spots: metro Detroit reads as Canadian
 * (inseparable from Windsor at this fidelity), the Alaska panhandle interior
 * is approximate.
 */

/** (lon, southern border lat) west -> east; Canada is north of this chain. */
const BORDER: ReadonlyArray<readonly [number, number]> = [
  [-141, 60],
  [-135, 59.5],
  [-130, 54.4],
  [-123.3, 49.0],
  [-95.15, 49.0],
  [-94.8, 49.35],
  [-90, 48.05],
  [-84.8, 46.45],
  [-83.2, 42.0],
  [-82.4, 42.6],
  [-80, 42.6],
  [-79.0, 43.05],
  [-76.4, 44.1],
  [-74.7, 45.0],
  [-71.5, 45.0],
  [-70.3, 45.9],
  [-69.2, 47.45],
  [-67.8, 47.0],
  [-66.9, 44.6],
  [-66, 43.2],
  [-52.6, 43.2],
];

export function isLikelyCanada(lat: number, lon: number): boolean {
  if (lon < -141 || lon > -52.6 || lat > 84) return false;
  for (let i = 0; i < BORDER.length - 1; i++) {
    const [lon1, lat1] = BORDER[i]!;
    const [lon2, lat2] = BORDER[i + 1]!;
    if (lon >= lon1 && lon <= lon2) {
      const t = (lon - lon1) / (lon2 - lon1);
      return lat > lat1 + t * (lat2 - lat1);
    }
  }
  return false;
}

const KM_PER_MILE = 1.609344;

/** "59.1 mi" or "95 km" — km readers get whole numbers, they don't do tenths. */
export function formatDistance(miles: number, metric: boolean): string {
  return metric ? `${Math.round(miles * KM_PER_MILE)} km` : `${miles} mi`;
}

/** Radius option labels: the wire stays miles, Canadians read "80 km". */
export function formatRadius(miles: number, metric: boolean): string {
  return metric ? `${Math.round(miles * KM_PER_MILE / 5) * 5} km` : `${miles} mi`;
}
