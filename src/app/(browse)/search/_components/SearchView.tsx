"use client";

import styled from "@emotion/styled";
import dynamic from "next/dynamic";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { HoverProvider } from "./hover-context";
import { ResultsGrid } from "./ResultsGrid";

const ResultsMap = dynamic(() => import("./ResultsMap"), {
  ssr: false,
  loading: () => <MapLoading>Waking up the map…</MapLoading>,
});

const Split = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(6)};
  ${({ theme }) => theme.mq.lg} {
    grid-template-columns: minmax(0, 1fr) 420px;
    align-items: start;
  }
`;

const MapPane = styled.div<{ mobileOpen: boolean }>`
  display: ${({ mobileOpen }) => (mobileOpen ? "block" : "none")};
  position: fixed;
  inset: 57px 0 0 0;
  z-index: ${({ theme }) => theme.z.overlay};
  background: ${({ theme }) => theme.colors.surface};
  ${({ theme }) => theme.mq.lg} {
    display: block;
    position: sticky;
    top: ${({ theme }) => theme.space(4)};
    inset: auto;
    z-index: ${({ theme }) => theme.z.base};
    height: calc(100vh - 120px);
    border-radius: ${({ theme }) => theme.radii.lg};
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const MapLoading = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 240px;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surfaceSunken};
`;

const ListPane = styled.div<{ mobileHidden: boolean }>`
  display: ${({ mobileHidden }) => (mobileHidden ? "none" : "block")};
  ${({ theme }) => theme.mq.lg} {
    display: block;
  }
`;

const TogglePill = styled.button`
  position: fixed;
  bottom: ${({ theme }) => theme.space(6)};
  left: 50%;
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.z.toast};
  background: ${({ theme }) => theme.colors.textPrimary};
  color: ${({ theme }) => theme.colors.surface};
  border: none;
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(5)}`};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-size: ${({ theme }) => theme.typography.size.sm};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  cursor: pointer;
  ${({ theme }) => theme.mq.lg} {
    display: none;
  }
`;

export function SearchView() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(["list", "map"] as const).withDefault("list"),
  );
  const mapOpen = view === "map";

  return (
    <HoverProvider>
      <Split>
        <ListPane mobileHidden={mapOpen}>
          <ResultsGrid />
        </ListPane>
        {/* The map is an enhancement of the list, never the sole access path —
            every pin's pet is reachable in the synced grid. */}
        <MapPane mobileOpen={mapOpen}>
          <ResultsMap />
        </MapPane>
      </Split>
      <TogglePill onClick={() => void setView(mapOpen ? "list" : "map")}>
        {mapOpen ? "☰ List" : "🗺 Map"}
      </TogglePill>
    </HoverProvider>
  );
}
