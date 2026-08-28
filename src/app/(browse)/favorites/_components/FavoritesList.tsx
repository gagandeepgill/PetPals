"use client";

import styled from "@emotion/styled";
import { useQueries } from "@tanstack/react-query";
import { PetCard } from "@/components/ui/PetCard";
import { ButtonLink, CardGrid, Muted } from "@/components/ui/primitives";
import type { Pet } from "@/lib/domain/pet";
import type { PetCardData } from "@/lib/domain/search";
import { useFavorites } from "@/lib/favorites";
import { petKeys } from "@/lib/query-keys";

const GoneNote = styled.div`
  border: 1.5px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  display: grid;
  place-items: center;
  text-align: center;
  aspect-ratio: 4 / 5;
`;

function petToCard(pet: Pet): PetCardData {
  const primary = pet.photos[0] ?? null;
  const breedLabel =
    pet.breed.rawBreedText || (pet.breed.isMixed ? "Mixed breed" : "Breed unknown");
  const group = pet.age.group;
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species as PetCardData["species"],
    ageGroup: group,
    ageLabel: group === "unknown" ? "Age unknown" : group[0]!.toUpperCase() + group.slice(1),
    breedLabel,
    distanceMi: null,
    city: pet.location.city,
    state: pet.location.state,
    orgName: pet.organizationName,
    sourceLabel: pet.sourceLabel,
    status: pet.status,
    listedAt: pet.updatedAt,
    photo: primary ? { url: primary.url, blurDataURL: primary.blurDataURL } : null,
    photoAlt: `${pet.name}, a ${breedLabel}`,
  };
}

export function FavoritesList() {
  const { hydrated, favoriteIds } = useFavorites();

  const results = useQueries({
    queries: favoriteIds.map((id) => ({
      queryKey: petKeys.detail(id),
      queryFn: async (): Promise<Pet | null> => {
        const res = await fetch(`/api/pets/${id}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        return res.json() as Promise<Pet>;
      },
      staleTime: 5 * 60_000,
    })),
  });

  if (!hydrated) return null;

  if (favoriteIds.length === 0) {
    return (
      <>
        <Muted>
          Nobody saved yet. Tap the heart on any pet who sticks with you — they&apos;ll wait
          here.
        </Muted>
        <ButtonLink href="/search">See who&apos;s waiting</ButtonLink>
      </>
    );
  }

  return (
    <CardGrid>
      {favoriteIds.map((id, i) => {
        const result = results[i];
        if (!result || result.isPending) return <GoneNote key={id}>Checking on them…</GoneNote>;
        const pet = result.data;
        if (!pet || pet.status === "removed" || pet.status === "adopted") {
          return (
            <GoneNote key={id}>
              <span>
                {pet ? `${pet.name} found a home 🎉` : "This pet isn't listed anymore"}
                <br />
                Chances are that&apos;s good news.
              </span>
            </GoneNote>
          );
        }
        return <PetCard key={id} pet={petToCard(pet)} />;
      })}
    </CardGrid>
  );
}
