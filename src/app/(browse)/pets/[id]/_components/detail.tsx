"use client";

import styled from "@emotion/styled";
import Image from "next/image";
import type { Pet, TriState } from "@/lib/domain/pet";
import { Badge, ButtonAnchor } from "@/components/ui/primitives";

const Hero = styled.div`
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceSunken};
  margin-bottom: ${({ theme }) => theme.space(4)};
  ${({ theme }) => theme.mq.md} {
    aspect-ratio: 16 / 9;
  }
`;

const FactsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
  margin: ${({ theme }) => `${theme.space(3)} 0 ${theme.space(4)}`};
`;

const OrgCard = styled.aside`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  padding: ${({ theme }) => theme.space(5)};
  margin: ${({ theme }) => `${theme.space(6)} 0`};
`;

const OrgName = styled.p`
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 ${({ theme }) => theme.space(1)};
`;

const OrgMeta = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin: 0 0 ${({ theme }) => theme.space(4)};
`;

const StatusBanner = styled.div<{ tone: "warning" | "success" }>`
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
  margin-bottom: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.colors.surfaceSunken};
  color: ${({ theme, tone }) =>
    tone === "warning" ? theme.colors.warning : theme.colors.success};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

function compatBadge(label: string, value: TriState) {
  if (value === true) return <Badge tone="success">✓ {label}</Badge>;
  if (value === false) return <Badge tone="danger">✗ {label}</Badge>;
  return <Badge>? {label} — ask the shelter</Badge>;
}

export function PetDetail({ pet, verifiedAgo }: { pet: Pet; verifiedAgo: string }) {
  const primaryPhoto = pet.photos[0];
  const breedLabel =
    pet.breed.rawBreedText || (pet.breed.isMixed ? "Mixed breed" : "Breed unknown");

  return (
    <>
      {pet.status === "adopted" || pet.status === "removed" ? (
        <StatusBanner tone="success">
          Looks like {pet.name} found a home 🎉 — check the similar pets below.
        </StatusBanner>
      ) : pet.status === "pending" ? (
        <StatusBanner tone="warning">
          An adoption for {pet.name} is pending — the shelter can confirm current status.
        </StatusBanner>
      ) : null}

      {primaryPhoto ? (
        <Hero>
          <Image
            src={primaryPhoto.url}
            alt={`${pet.name}, a ${breedLabel}`}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 768px) 100vw, 900px"
            priority
          />
        </Hero>
      ) : null}

      <FactsRow>
        <Badge>{pet.age.group === "unknown" ? "Age unknown" : pet.age.group}</Badge>
        <Badge>{pet.sex === "unknown" ? "Sex unknown" : pet.sex}</Badge>
        <Badge>{breedLabel}</Badge>
        {pet.size !== "unknown" ? <Badge>size {pet.size.toUpperCase()}</Badge> : null}
        {pet.houseTrained === true ? <Badge tone="success">✓ House-trained</Badge> : null}
      </FactsRow>

      <FactsRow aria-label="Compatibility">
        {compatBadge("Kids", pet.compat.kids)}
        {compatBadge("Dogs", pet.compat.dogs)}
        {compatBadge("Cats", pet.compat.cats)}
      </FactsRow>

      <OrgCard>
        <OrgName>{pet.organizationName}</OrgName>
        <OrgMeta>
          {[pet.location.city, pet.location.state].filter(Boolean).join(", ")} · via{" "}
          {pet.sourceLabel} · last verified {verifiedAgo}
        </OrgMeta>
        {pet.sourceUrl ? (
          <ButtonAnchor href={pet.sourceUrl} target="_blank" rel="noopener noreferrer">
            Start adoption at {pet.organizationName} ↗
          </ButtonAnchor>
        ) : null}
        <OrgMeta style={{ marginTop: 12, marginBottom: 0 }}>
          Pet Pals doesn&apos;t process adoptions — you&apos;ll apply directly with the shelter.
        </OrgMeta>
      </OrgCard>
    </>
  );
}
