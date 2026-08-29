/**
 * Org-level facts for ASM (sheltermanager.com) accounts. The asmservice feed
 * carries no address data, so shelter geography lives here — publicly stated
 * facts from each org's own website (name, city, coordinates), never guesses.
 * A pet inherits its org's coordinates; that's what puts it on the map and in
 * "near me" results.
 *
 * ASM3_ACCOUNTS still overrides which accounts sync (and can name orgs not in
 * this registry — they just won't have geo until added here).
 */

export interface Asm3OrgInfo {
  name: string;
  city: string;
  /** Province/state code, e.g. "ON", "BC", "TX". */
  region: string;
  country: "CA" | "US";
  lat: number;
  lon: number;
}

export const KNOWN_ASM3_ORGS: Record<string, Asm3OrgInfo> = {
  // Filled from verified feeds only — see scripts/snapshot and PR notes.
};

/** Accounts synced when ASM3_ACCOUNTS is unset: every registry org. */
export function defaultAsm3Accounts(): string[] {
  return Object.keys(KNOWN_ASM3_ORGS);
}
