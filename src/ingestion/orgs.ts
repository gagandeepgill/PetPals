/**
 * Org-level facts for ASM (sheltermanager.com) accounts. The asmservice feed
 * carries no address data, so shelter geography lives here — publicly stated
 * facts from each org's own website (name, city, coordinates), never guesses.
 * A pet inherits its org's coordinates; that's what puts it on the map and in
 * "near me" results. Foster-based rescues get their home-city coordinates.
 *
 * Every account below was verified live (feed returns real adoptables) and
 * attributed via the org's own site embedding that account, 2026-08-28.
 *
 * ASM3_ACCOUNTS still overrides which accounts sync (and can name orgs not in
 * this registry — they just won't have geo until added here).
 */

export interface Asm3OrgInfo {
  name: string;
  city?: string;
  /** Province/state code, e.g. "ON", "BC", "TX". */
  region?: string;
  country?: "CA" | "US";
  lat?: number;
  lon?: number;
  /** Some accounts leak internal staff/medical notes into the feed's
   *  free-text fields — never render those descriptions. */
  suppressDescriptions?: boolean;
}

export const KNOWN_ASM3_ORGS: Record<string, Asm3OrgInfo> = {
  // Identity unverified beyond the feed itself — neutral label, no geo.
  ja0095: { name: "Shelter ja0095" },
  mf2728: {
    name: "MEOW Foundation",
    city: "Calgary",
    region: "AB",
    country: "CA",
    lat: 51.0916,
    lon: -114.062,
  },
  da2786: {
    name: "Furball Force Animal Rescue",
    city: "Calgary",
    region: "AB",
    country: "CA",
    lat: 51.0447,
    lon: -114.0719,
  },
  sh1874: {
    name: "Pawsitive Match Rescue Foundation",
    city: "Calgary",
    region: "AB",
    country: "CA",
    lat: 51.0447,
    lon: -114.0719,
    // Feed's comment fields carry bite contracts / vet correspondence.
    suppressDescriptions: true,
  },
  darcysarc: {
    name: "D'Arcy's A.R.C.",
    city: "Winnipeg",
    region: "MB",
    country: "CA",
    lat: 49.8999,
    lon: -97.2057,
  },
  oscatr: {
    name: "Ottawa Stray Cat Rescue",
    city: "Ottawa",
    region: "ON",
    country: "CA",
    lat: 45.4215,
    lon: -75.6972,
  },
  arthuranimalrescue: {
    name: "Arthur Animal Rescue",
    city: "Guelph",
    region: "ON",
    country: "CA",
    lat: 43.832,
    lon: -80.537,
  },
};

/** Accounts synced when ASM3_ACCOUNTS is unset: every registry org. */
export function defaultAsm3Accounts(): string[] {
  return Object.keys(KNOWN_ASM3_ORGS);
}
