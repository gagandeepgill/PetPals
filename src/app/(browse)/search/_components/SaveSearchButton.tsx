"use client";

import styled from "@emotion/styled";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { parseSearchParams } from "@/lib/domain/search";
import { describeFilters, searchParamsKey, useSavedSearches } from "@/lib/saved-searches";

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding-bottom: ${({ theme }) => theme.space(3)};
`;

const SaveButton = styled.button<{ saved: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3.5)}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1.5px solid
    ${({ theme, saved }) => (saved ? theme.colors.trust : theme.colors.border)};
  background: ${({ theme, saved }) =>
    saved ? "color-mix(in srgb, var(--pp-trust) 10%, transparent)" : theme.colors.surfaceRaised};
  color: ${({ theme, saved }) => (saved ? theme.colors.trust : theme.colors.textPrimary)};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  cursor: pointer;
`;

const Hint = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
`;

export function SaveSearchButton() {
  const searchParams = useSearchParams();
  const filter = useMemo(
    () => parseSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const key = useMemo(() => searchParamsKey(filter), [filter]);
  const { hydrated, isSaved, save } = useSavedSearches();
  if (!hydrated) return null;

  const saved = isSaved(key);
  return (
    <Row>
      <SaveButton
        saved={saved}
        aria-pressed={saved}
        onClick={() => {
          if (!saved) save(key, describeFilters(filter));
        }}
      >
        {saved ? "✓ Search saved" : "🔖 Save this search"}
      </SaveButton>
      <Hint>
        {saved
          ? "We'll show newcomers under Saved."
          : "New pets arrive daily — save this and check back."}
      </Hint>
    </Row>
  );
}
