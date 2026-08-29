"use client";

import styled from "@emotion/styled";
import { css, keyframes } from "@emotion/react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useWindowVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PetCard } from "@/components/ui/PetCard";
import { CardGrid } from "@/components/ui/primitives";
import { parseSearchParams } from "@/lib/domain/search";
import { filterToParams, petKeys } from "@/lib/query-keys";
import { fetchSearchPage } from "@/lib/search-client";
import { isLikelyCanada } from "@/lib/units";
import { usePetHover } from "./hover-context";

const MIN_CARD_WIDTH = 240;
const GAP = 20;
const TEXT_BLOCK_HEIGHT = 96;

const Summary = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin: 0 0 ${({ theme }) => theme.space(4)};
`;

const Empty = styled.div`
  padding: ${({ theme }) => theme.space(12)} 0;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const enter = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

/* Entrance runs on route entry only, and ONLY on cards flagged data-enter —
   scroll-recycled virtual rows must never animate (DESIGN.md anti-jank). */
const GridShell = styled.div<{ pending: boolean }>`
  transition: opacity ${({ theme }) =>
    `${theme.motion.duration.fast} ${theme.motion.easing.standard}`};
  opacity: ${({ pending }) => (pending ? 0.6 : 1)};
  ${({ theme }) => css`
    ${theme.mq.motionOk} {
      [data-enter] article {
        animation: ${enter} ${theme.motion.duration.base} ${theme.motion.easing.enter} both;
        animation-delay: calc(min(var(--stagger-i, 0), 8) * 25ms);
      }
    }
  `}
`;

const LoadingMore = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => `${theme.space(6)} 0`};
`;

interface StoredScroll {
  y: number;
  width: number;
  columns: number;
  measurements: VirtualItem[];
}

function scrollKey(): string {
  return `pp-scroll:${window.location.search}`;
}

function readStoredScroll(): StoredScroll | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(scrollKey());
    return raw ? (JSON.parse(raw) as StoredScroll) : null;
  } catch {
    return null;
  }
}

export function ResultsGrid() {
  const { setHoveredPetId } = usePetHover();
  const searchParams = useSearchParams();
  const filter = useMemo(
    () => parseSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  // A Canadian origin reads distances in km; the wire format stays miles.
  const metric =
    filter.lat !== undefined && filter.lon !== undefined && isLikelyCanada(filter.lat, filter.lon);

  const query = useInfiniteQuery({
    queryKey: petKeys.search(filter),
    queryFn: ({ pageParam }) => fetchSearchPage(filterToParams(filter, pageParam)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
  });

  const pets = useMemo(() => query.data?.pages.flatMap((p) => p.results) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;

  // SSR + first client render: plain grid (crawlable, hydration-exact).
  // Virtualization takes over after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [stored] = useState<StoredScroll | null>(readStoredScroll);

  // Column count from container width. Seeded from the stored value so the
  // virtualizer can initialize WITH the measurements cache — initialOffset and
  // initialMeasurementsCache are only read at initialization, and a late width
  // would discard them (restored positions then drift as rows re-measure).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(() => stored?.width ?? 0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP)));
  const rowCount = Math.ceil(pets.length / columns);
  const cardWidth = columns > 0 ? (width - (columns - 1) * GAP) / columns : MIN_CARD_WIDTH;
  const estimatedRowHeight = cardWidth * 1.25 + TEXT_BLOCK_HEIGHT + GAP;

  const restorable = stored !== null && stored.columns === columns && width > 0;
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => estimatedRowHeight,
    overscan: 4,
    scrollMargin: containerRef.current?.offsetTop ?? 0,
    ...(restorable
      ? { initialOffset: stored.y, initialMeasurementsCache: stored.measurements }
      : {}),
  });
  const virtualRows = mounted && width > 0 ? virtualizer.getVirtualItems() : [];

  // Restore scroll once the virtualized layout exists; retry across frames
  // because late image/layout settling can clamp the first attempt.
  const restoredRef = useRef(stored === null);
  useLayoutEffect(() => {
    if (restoredRef.current || !restorable || !mounted) return;
    restoredRef.current = true;
    let tries = 0;
    const attempt = () => {
      window.scrollTo(0, stored.y);
      if (Math.abs(window.scrollY - stored.y) > 2 && tries++ < 10) {
        requestAnimationFrame(attempt);
      }
    };
    requestAnimationFrame(attempt);
  }, [restorable, mounted, stored]);

  // Persist scroll + measurements (throttled) for back-navigation. Never save
  // before restoration settles — early scroll events at y=0 would clobber the
  // stored position we're about to restore to.
  useEffect(() => {
    if (!mounted) return;
    let last = 0;
    const save = () => {
      if (!restoredRef.current) return;
      // Navigation-away scroll-to-top delivers a scroll event after location
      // has already changed — never let it clobber the stored position.
      if (window.location.pathname !== "/search") return;
      const now = Date.now();
      if (now - last < 250) return;
      last = now;
      try {
        sessionStorage.setItem(
          scrollKey(),
          JSON.stringify({
            y: window.scrollY,
            width,
            columns,
            measurements: virtualizer.measurementsCache,
          } satisfies StoredScroll),
        );
      } catch {
        /* storage full/blocked: restoration is a convenience */
      }
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [mounted, width, columns, virtualizer]);

  // Fetch trigger is virtual-index-based: the sentinel pattern breaks under
  // virtualization (the tail row may never be in the DOM).
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const lastVirtualRow = virtualRows[virtualRows.length - 1]?.index ?? -1;
  useEffect(() => {
    if (!mounted) return;
    if (lastVirtualRow >= rowCount - 2 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [mounted, lastVirtualRow, rowCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Entrance animation on route entry only.
  const animateIn = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      animateIn.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (query.status === "success" && pets.length === 0) {
    return (
      <Empty>
        <p>Nobody matches that yet — but new pets arrive every day.</p>
        <p>Try widening the radius or removing a filter.</p>
      </Empty>
    );
  }

  const cardWrap = (petIndex: number, child: React.ReactNode) => {
    const pet = pets[petIndex]!;
    return (
      <div
        key={pet.id}
        style={{ "--stagger-i": petIndex } as React.CSSProperties}
        {...(animateIn.current && petIndex < 8 ? { "data-enter": true } : {})}
        onMouseEnter={() => setHoveredPetId(pet.id)}
        onMouseLeave={() => setHoveredPetId(null)}
      >
        {child}
      </div>
    );
  };

  return (
    <GridShell pending={query.isPlaceholderData}>
      <Summary aria-live="polite">
        About {total} available {total === 1 ? "pet" : "pets"}
      </Summary>
      <div ref={containerRef}>
        {!mounted || width === 0 ? (
          <CardGrid>
            {pets.slice(0, 24).map((pet, i) => cardWrap(i, <PetCard pet={pet} priority={i < 4} metric={metric} />))}
          </CardGrid>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualRows.map((row) => {
              const start = row.index * columns;
              const rowPets = pets.slice(start, start + columns);
              return (
                <div
                  key={row.key}
                  ref={virtualizer.measureElement}
                  data-index={row.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: GAP,
                    paddingBottom: GAP,
                  }}
                >
                  {rowPets.map((pet, i) =>
                    cardWrap(start + i, <PetCard pet={pet} priority={start + i < 4} metric={metric} />),
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {isFetchingNextPage ? <LoadingMore>Fetching more pals…</LoadingMore> : null}
    </GridShell>
  );
}
