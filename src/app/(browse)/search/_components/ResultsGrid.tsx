"use client";

import styled from "@emotion/styled";
import { PetCard } from "@/components/ui/PetCard";
import { ButtonLink, CardGrid } from "@/components/ui/primitives";
import type { SearchResponse } from "@/lib/domain/search";

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

const More = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => `${theme.space(8)} 0`};
`;

export function ResultsGrid({
  response,
  nextHref,
}: {
  response: SearchResponse;
  nextHref: string | null;
}) {
  if (response.results.length === 0) {
    return (
      <Empty>
        <p>No pets match these filters yet.</p>
        <p>Try widening the radius or removing a filter — new pets arrive daily.</p>
      </Empty>
    );
  }

  return (
    <>
      <Summary aria-live="polite">
        About {response.total} available {response.total === 1 ? "pet" : "pets"}
      </Summary>
      <CardGrid>
        {response.results.map((pet, i) => (
          <PetCard key={pet.id} pet={pet} priority={i < 4} />
        ))}
      </CardGrid>
      {nextHref ? (
        <More>
          <ButtonLink href={nextHref} variant="secondary">
            Show more pets
          </ButtonLink>
        </More>
      ) : null}
    </>
  );
}
