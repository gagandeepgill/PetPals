"use client";

import styled from "@emotion/styled";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Muted, SectionTitle } from "@/components/ui/primitives";
import type { SearchResponse } from "@/lib/domain/search";
import { fetchSearchPage } from "@/lib/search-client";
import { useSavedSearches, type SavedSearch } from "@/lib/saved-searches";

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 ${({ theme }) => theme.space(10)};
  display: grid;
  gap: ${({ theme }) => theme.space(2)};
`;

const RowCard = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
`;

const OpenButton = styled.button`
  flex: 1;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-size: ${({ theme }) => theme.typography.size.md};
  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: ${({ theme }) => theme.typography.size.xs};
    font-weight: ${({ theme }) => theme.typography.weight.regular};
    margin-top: 2px;
  }
`;

const NewBadge = styled.span`
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textOnAccent};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-variant-numeric: tabular-nums;
  padding: 2px 10px;
  white-space: nowrap;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => theme.space(2)};
  &:hover {
    color: ${({ theme }) => theme.colors.danger};
  }
`;

function useSearchTotals(searches: SavedSearch[]) {
  return useQueries({
    queries: searches.map((s) => ({
      queryKey: ["saved-search-total", s.params],
      queryFn: async (): Promise<number> => {
        const params = new URLSearchParams(s.params);
        params.set("limit", "1");
        const res: SearchResponse = await fetchSearchPage(params);
        return res.total;
      },
      staleTime: 5 * 60_000,
    })),
  });
}

export function SavedSearchesList() {
  const router = useRouter();
  const { hydrated, searches, remove, markSeen } = useSavedSearches();
  const totals = useSearchTotals(searches);

  if (!hydrated || searches.length === 0) return null;

  return (
    <section aria-labelledby="saved-searches">
      <SectionTitle id="saved-searches">Saved searches</SectionTitle>
      <Muted>New pets arrive daily — a saved search shows who turned up since your last look.</Muted>
      <List>
        {searches.map((search, i) => {
          const total = totals[i]?.data;
          const fresh =
            total !== undefined && search.lastSeenTotal !== null
              ? Math.max(0, total - search.lastSeenTotal)
              : null;
          return (
            <RowCard key={search.id}>
              <OpenButton
                onClick={() => {
                  if (total !== undefined) markSeen(search.id, total);
                  router.push(`/search?${search.params}`);
                }}
              >
                {search.label}
                <span>
                  {total !== undefined ? `${total} ${total === 1 ? "pet" : "pets"}` : "checking…"}
                  {search.lastSeenTotal === null && total !== undefined
                    ? " · first check"
                    : ""}
                </span>
              </OpenButton>
              {fresh !== null && fresh > 0 ? <NewBadge>+{fresh} new</NewBadge> : null}
              <RemoveButton
                aria-label={`Remove saved search: ${search.label}`}
                onClick={() => remove(search.id)}
              >
                Remove
              </RemoveButton>
            </RowCard>
          );
        })}
      </List>
    </section>
  );
}
