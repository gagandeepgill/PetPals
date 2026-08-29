"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RADII, type SearchFilter } from "./domain/search";
import { filterToParams } from "./query-keys";
import { formatRadius, isLikelyCanada } from "./units";

/**
 * Saved searches — the retention core (DESIGN.md): pets move fast, so "tell me
 * when someone new matches" beats browsing. v1 is anonymous and local (same
 * posture as favorites); the email/push alert engine layers on server-side
 * once accounts exist. "New" is honest arithmetic: current total vs the total
 * when the user last opened the search.
 */

export interface SavedSearch {
  id: string;
  /** Canonical query string (cursor/from/view stripped) — identity AND replay. */
  params: string;
  label: string;
  createdAt: number;
  /** Result total when last opened; the "new since last visit" baseline. */
  lastSeenTotal: number | null;
}

/** Canonical, replayable query string for a filter set. */
export function searchParamsKey(filter: SearchFilter): string {
  return filterToParams(filter, null).toString();
}

const AGE_LABELS: Record<string, string> = {
  baby: "Baby",
  young: "Young",
  adult: "Adult",
  senior: "Senior",
};

export function describeFilters(filter: SearchFilter): string {
  const parts: string[] = [];
  parts.push(
    filter.species
      ? filter.species === "other"
        ? "Other pets"
        : `${filter.species[0]!.toUpperCase()}${filter.species.slice(1)}s`
      : "All pets",
  );
  if (filter.ageGroup?.length) {
    parts.push(filter.ageGroup.map((a) => AGE_LABELS[a] ?? a).join("/"));
  }
  if (filter.size?.length) parts.push(`size ${filter.size.join("/").toUpperCase()}`);
  if (filter.energy?.length) parts.push(`${filter.energy.join("/")} energy`);
  if (filter.goodWith?.length) parts.push(`good with ${filter.goodWith.join(" & ")}`);
  if (filter.zip || (filter.lat !== undefined && filter.lon !== undefined)) {
    const radius = (RADII as readonly number[]).includes(filter.radius) ? filter.radius : 50;
    const metric =
      filter.lat !== undefined && filter.lon !== undefined && isLikelyCanada(filter.lat, filter.lon);
    parts.push(
      filter.zip
        ? `within ${radius} mi of ${filter.zip}`
        : `within ${formatRadius(radius, metric)} of you`,
    );
  }
  if (filter.bbox) parts.push("in a map area");
  return parts.join(" · ");
}

interface SavedSearchesState {
  searches: SavedSearch[];
  save: (params: string, label: string) => void;
  remove: (id: string) => void;
  markSeen: (id: string, total: number) => void;
}

const useSavedSearchesStore = create<SavedSearchesState>()(
  persist(
    (set) => ({
      searches: [],
      save: (params, label) =>
        set((state) => {
          if (state.searches.some((s) => s.params === params)) return state;
          return {
            searches: [
              {
                id: `ss-${Date.now().toString(36)}-${state.searches.length}`,
                params,
                label,
                createdAt: Date.now(),
                lastSeenTotal: null,
              },
              ...state.searches,
            ].slice(0, 20),
          };
        }),
      remove: (id) =>
        set((state) => ({ searches: state.searches.filter((s) => s.id !== id) })),
      markSeen: (id, total) =>
        set((state) => ({
          searches: state.searches.map((s) =>
            s.id === id ? { ...s, lastSeenTotal: total } : s,
          ),
        })),
    }),
    { name: "pp-saved-searches" },
  ),
);

/** Hydration-safe facade, mirroring useFavorites/useQuizProfile. */
export function useSavedSearches() {
  const store = useSavedSearchesStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return {
    hydrated,
    searches: hydrated ? store.searches : [],
    isSaved: (params: string) => hydrated && store.searches.some((s) => s.params === params),
    save: store.save,
    remove: store.remove,
    markSeen: store.markSeen,
  };
}
