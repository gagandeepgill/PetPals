"use client";

import { createContext, useContext, useMemo, useState } from "react";

/** Card <-> pin hover sync. Component-level context, not global store. */
interface HoverState {
  hoveredPetId: string | null;
  setHoveredPetId: (id: string | null) => void;
}

const HoverContext = createContext<HoverState>({
  hoveredPetId: null,
  setHoveredPetId: () => undefined,
});

export function HoverProvider({ children }: { children: React.ReactNode }) {
  const [hoveredPetId, setHoveredPetId] = useState<string | null>(null);
  const value = useMemo(() => ({ hoveredPetId, setHoveredPetId }), [hoveredPetId]);
  return <HoverContext.Provider value={value}>{children}</HoverContext.Provider>;
}

export function usePetHover() {
  return useContext(HoverContext);
}
