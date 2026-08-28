"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  /** IDs only, never pet objects — the favorites page fetches current data,
   *  which is how adopted-since-favorited gets caught. */
  ids: Record<string, { addedAt: number }>;
  toggle: (petId: string) => void;
}

const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: {},
      toggle: (petId) =>
        set((state) => {
          const next = { ...state.ids };
          if (next[petId]) {
            delete next[petId];
          } else {
            next[petId] = { addedAt: Date.now() };
          }
          return { ids: next };
        }),
    }),
    { name: "pp-favorites" },
  ),
);

/**
 * Facade over the anonymous localStorage store, so the v2 server-backed
 * implementation swaps in without touching call sites. Returns inert values
 * until after hydration to avoid SSR mismatch.
 */
export function useFavorites() {
  const ids = useFavoritesStore((s) => s.ids);
  const toggle = useFavoritesStore((s) => s.toggle);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return {
    hydrated,
    count: hydrated ? Object.keys(ids).length : 0,
    favoriteIds: hydrated ? Object.keys(ids).sort((a, b) => (ids[b]?.addedAt ?? 0) - (ids[a]?.addedAt ?? 0)) : [],
    isFavorite: (petId: string) => hydrated && Boolean(ids[petId]),
    toggle,
  };
}
