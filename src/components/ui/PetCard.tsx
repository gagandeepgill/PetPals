"use client";

import styled from "@emotion/styled";
import Image from "next/image";
import Link from "next/link";
import type { PetCardData } from "@/lib/domain/search";
import { FavoriteToggle } from "./FavoriteToggle";
import { PetPhotoFallback } from "./PetPhotoFallback";

/* Borderless "quiet surface" card: the card IS photo + text stack. Separation
   comes from whitespace, not chrome. Hover = photo zoom, never lift. */
const Card = styled.article`
  position: relative;
  ${({ theme }) => theme.mq.motionOk} {
    transition: transform ${({ theme }) =>
      `${theme.motion.duration.fast} ${theme.motion.easing.standard}`};
  }
  &:active {
    transform: scale(0.98);
  }
`;

/* 4:5 portrait, 12px radius (one step under the card token), warm sand under
   loading images. ::before = constant unifying gradient (harmonizes mixed
   shelter-photo white balance, guarantees chip legibility); ::after = 1px
   inset border masking ragged UGC edges. */
const Frame = styled.div`
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceSunken};
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: linear-gradient(rgba(224, 122, 95, 0.04), rgba(45, 42, 38, 0.1));
  }
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    border-radius: inherit;
    border: 1px solid rgba(45, 42, 38, 0.08);
  }
  img {
    object-fit: cover;
    object-position: center 30%; /* face bias: pets sit in the upper third */
  }
  ${({ theme }) => theme.mq.motionOk} {
    img {
      transition: transform 300ms ${({ theme }) => theme.motion.easing.standard};
    }
    article:hover & img {
      transform: scale(1.04);
    }
  }
`;

const Body = styled.div`
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(0.5)} 0`};
`;

const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.display};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 ${({ theme }) => theme.space(1)};
  transition: color ${({ theme }) =>
    `${theme.motion.duration.fast} ${theme.motion.easing.standard}`};
  article:hover & {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

const Facts = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin: 0 0 ${({ theme }) => theme.space(1)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Attribution = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.85;
  font-size: ${({ theme }) => theme.typography.size.xs};
  margin: 0;
`;

const CardLink = styled(Link)`
  position: absolute;
  inset: 0;
  z-index: ${({ theme }) => theme.z.card};
  border-radius: ${({ theme }) => theme.radii.md};
`;

/* Solid chip over the photo — never a scrim, never backdrop-blur. Max one. */
const PhotoChip = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.space(3)};
  left: ${({ theme }) => theme.space(3)};
  z-index: 2;
  background: ${({ theme }) => theme.colors.surfaceRaised};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.pill};
  box-shadow: ${({ theme }) => theme.shadows.sm};
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
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            {...(pet.photo.blurDataURL
              ? { placeholder: "blur" as const, blurDataURL: pet.photo.blurDataURL }
              : {})}
          />
        ) : (
          <PetPhotoFallback name={pet.name} />
        )}
        {pet.distanceMi !== null && pet.distanceMi <= 5 ? (
          <PhotoChip>{pet.distanceMi} mi away</PhotoChip>
        ) : null}
        <FavoriteToggle petId={pet.id} petName={pet.name} />
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
