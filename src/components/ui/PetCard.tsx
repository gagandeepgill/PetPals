"use client";

import styled from "@emotion/styled";
import Image from "next/image";
import Link from "next/link";
import type { PetCardData } from "@/lib/domain/search";

const Card = styled.article`
  position: relative;
  border-radius: ${({ theme }) => theme.radii.card};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  overflow: hidden;
  ${({ theme }) => theme.mq.motionOk} {
    transition:
      transform ${({ theme }) => `${theme.motion.duration.base} ${theme.motion.easing.standard}`},
      box-shadow ${({ theme }) => `${theme.motion.duration.base} ${theme.motion.easing.standard}`};
    &:hover,
    &:focus-within {
      transform: translateY(-4px);
      box-shadow: ${({ theme }) => theme.shadows.lg};
    }
  }
  ${({ theme }) => theme.mq.motionReduce} {
    &:hover,
    &:focus-within {
      box-shadow: ${({ theme }) => theme.shadows.lg};
    }
  }
`;

/* Fixed aspect ratio keeps rows stable for future virtualization — no CLS. */
const Frame = styled.div`
  position: relative;
  aspect-ratio: 4 / 3;
  background: ${({ theme }) => theme.colors.surfaceSunken};
`;

const Body = styled.div`
  padding: ${({ theme }) => theme.space(3)};
`;

const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 ${({ theme }) => theme.space(1)};
`;

const Facts = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin: 0 0 ${({ theme }) => theme.space(1)};
`;

const Attribution = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  margin: 0;
`;

const CardLink = styled(Link)`
  position: absolute;
  inset: 0;
  z-index: ${({ theme }) => theme.z.card};
`;

export function PetCard({ pet, priority = false }: { pet: PetCardData; priority?: boolean }) {
  const placeLabel =
    pet.distanceMi !== null
      ? `${pet.distanceMi} mi`
      : [pet.city, pet.state].filter(Boolean).join(", ");
  const facts = [pet.ageLabel, pet.breedLabel, placeLabel].filter(Boolean).join(" · ");

  return (
    <Card>
      <Frame>
        {pet.photo ? (
          <Image
            src={pet.photo.url}
            alt={pet.photoAlt}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            {...(pet.photo.blurDataURL
              ? { placeholder: "blur" as const, blurDataURL: pet.photo.blurDataURL }
              : {})}
          />
        ) : null}
      </Frame>
      <Body>
        <Name>{pet.name}</Name>
        <Facts>{facts}</Facts>
        <Attribution>
          {pet.orgName} · via {pet.sourceLabel}
        </Attribution>
      </Body>
      <CardLink href={`/pets/${pet.id}`} aria-label={`${pet.name}: ${facts}, at ${pet.orgName}`} />
    </Card>
  );
}
