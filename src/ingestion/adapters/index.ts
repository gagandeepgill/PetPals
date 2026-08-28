import type { SourceAdapter } from "../types";
import { asm3AdaptersFromEnv } from "./asm3";
import { rescueGroupsAdapter } from "./rescuegroups";

export const ADAPTERS: SourceAdapter[] = [
  rescueGroupsAdapter,
  ...asm3AdaptersFromEnv(process.env.ASM3_ACCOUNTS),
];

export function adapterById(sourceId: string): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.sourceId === sourceId);
}

/** "asm3:ja0095" -> { source: "asm3", siteId: "ja0095" }; plain ids pass through. */
export function splitSourceId(sourceId: string): { source: string; siteId: string | null } {
  const idx = sourceId.indexOf(":");
  if (idx === -1) return { source: sourceId, siteId: null };
  return { source: sourceId.slice(0, idx), siteId: sourceId.slice(idx + 1) };
}
