"use client";

import styled from "@emotion/styled";
import { css, keyframes } from "@emotion/react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { PetCard } from "@/components/ui/PetCard";
import { CardGrid } from "@/components/ui/primitives";
import { parseSearchParams, type SearchResponse } from "@/lib/domain/search";
import { filterToParams, petKeys } from "@/lib/query-keys";

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

/* Container dims while a new filter's page loads (placeholder data showing) —
   continuity comes from the grid never blanking. Entrance stagger runs on
   route entry only, capped at 8 cards (200ms window). */
const GridShell = styled.div<{ pending: boolean; animateIn: boolean }>`
  min-height: 40vh;
  transition: opacity ${({ theme }) =>
    `${theme.motion.duration.fast} ${theme.motion.easing.standard}`};
  opacity: ${({ pending }) => (pending ? 0.6 : 1)};
  ${({ animateIn, theme }) =>
    animateIn &&
    css`
      ${theme.mq.motionOk} {
        & > div > article {
          animation: ${enter} ${theme.motion.duration.base} ${theme.motion.easing.enter} both;
          animation-delay: calc(min(var(--stagger-i, 0), 8) * 25ms);
        }
      }
    `}
`;

const Sentinel = styled.div`
  height: 1px;
`;

const LoadingMore = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => `${theme.space(6)} 0`};
`;

async function fetchSearchPage(
  params: URLSearchParams,
): Promise<SearchResponse> {
  const res = await fetch(`/api/pets?${params.toString()}`);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return res.json() as Promise<SearchResponse>;
}

export function ResultsGrid() {
  const searchParams = useSearchParams();
  const filter = useMemo(
    () => parseSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const query = useInfiniteQuery({
    queryKey: petKeys.search(filter),
    queryFn: ({ pageParam }) => fetchSearchPage(filterToParams(filter, pageParam)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
    maxPages: 10,
  });

  // Entrance animation on route entry only — never on filter refinement.
  const animateIn = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      animateIn.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const pets = query.data?.pages.flatMap((p) => p.results) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  if (query.status === "success" && pets.length === 0) {
    return (
      <Empty>
        <p>Nobody matches that yet — but new pets arrive every day.</p>
        <p>Try widening the radius or removing a filter.</p>
      </Empty>
    );
  }

  return (
    <GridShell pending={query.isPlaceholderData} animateIn={animateIn.current}>
      <Summary aria-live="polite">
        About {total} available {total === 1 ? "pet" : "pets"}
      </Summary>
      <CardGrid>
        {pets.map((pet, i) => (
          <div key={pet.id} style={{ "--stagger-i": i } as React.CSSProperties}>
            <PetCard pet={pet} priority={i < 4} />
          </div>
        ))}
      </CardGrid>
      {isFetchingNextPage ? <LoadingMore>Fetching more pals…</LoadingMore> : null}
      <Sentinel ref={sentinelRef} aria-hidden />
    </GridShell>
  );
}
