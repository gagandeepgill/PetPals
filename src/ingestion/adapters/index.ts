import type { SourceAdapter } from "../types";
import { rescueGroupsAdapter } from "./rescuegroups";

export const ADAPTERS: SourceAdapter[] = [rescueGroupsAdapter];

export function adapterById(sourceId: string): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.sourceId === sourceId);
}
