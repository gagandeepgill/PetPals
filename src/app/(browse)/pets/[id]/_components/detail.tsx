"use client";

import styled from "@emotion/styled";
import Image from "next/image";
import Link from "next/link";
import type { Pet, TriState } from "@/lib/domain/pet";
import { Badge, ButtonAnchor } from "@/components/ui/primitives";
import { fitNotes, useQuizProfile } from "@/lib/quiz";

const Hero = styled.div<{ adopted?: boolean }>`
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceSunken};
  margin-bottom: ${({ theme }) => theme.space(4)};
  img {
    object-fit: cover;
    object-position: center 30%;
    ${({ adopted }) => (adopted ? "filter: saturate(0.7);" : "")}
  }
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    border: 1px solid rgba(45, 42, 38, 0.08);
  }
  ${({ theme }) => theme.mq.md} {
    aspect-ratio: 16 / 9;
  }
`;

/* Stat tiles, not pills: pills read as tags, tiles read as data. */
const StatGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space(2)};
  margin: ${({ theme }) => `${theme.space(3)} 0 ${theme.space(4)}`};
  ${({ theme }) => theme.mq.sm} {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatTile = styled.div`
  background: ${({ theme }) => theme.colors.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space(3)};
  dt {
    font-size: ${({ theme }) => theme.typography.size.xs};
    color: ${({ theme }) => theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 2px;
  }
  dd {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: ${({ theme }) => theme.typography.size.md};
    font-weight: ${({ theme }) => theme.typography.weight.display};
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;
  }
`;

const CompatRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space(2)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  ${({ theme }) => theme.mq.sm} {
    grid-template-columns: repeat(4, 1fr);
  }
`;

/* Tri-state visual language: yes = success tint; no = neutral minus (it's a
   preference, not an error); unknown = dashed "blank to be filled in". */
const CompatSlot = styled.div<{ state: TriState }>`
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.space(2.5)} ${theme.space(3)}`};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  ${({ theme, state }) =>
    state === true
      ? `border: 1px solid ${theme.colors.success};
         color: ${theme.colors.success};
         background: color-mix(in srgb, ${theme.colors.success} 10%, transparent);`
      : state === false
        ? `border: 1px solid ${theme.colors.border};
           color: ${theme.colors.textPrimary};`
        : `border: 1.5px dashed ${theme.colors.border};
           color: ${theme.colors.textSecondary};`}
  span[aria-hidden] {
    font-weight: ${({ theme }) => theme.typography.weight.bold};
    color: ${({ theme, state }) =>
      state === "unknown" ? theme.colors.warning : "inherit"};
  }
`;

const OrgCard = styled.aside`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme }) => theme.space(5)};
  margin: ${({ theme }) => `${theme.space(6)} 0`};
`;

const OrgName = styled.p`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.trust};
  font-size: ${({ theme }) => theme.typography.size.md};
  margin: 0 0 ${({ theme }) => theme.space(1)};
`;

const OrgMeta = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin: 0 0 ${({ theme }) => theme.space(4)};
`;

const CelebrationBanner = styled.div`
  background: ${({ theme }) => theme.colors.accentSubtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space(4)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  a {
    color: ${({ theme }) => theme.colors.trust};
  }
`;

const PendingBanner = styled.div`
  background: ${({ theme }) => theme.colors.surfaceSunken};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.colors.warning};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const FitSection = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  padding: ${({ theme }) => theme.space(4)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  h2 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: ${({ theme }) => theme.typography.size.md};
    font-weight: ${({ theme }) => theme.typography.weight.display};
    margin: 0 0 ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
  a {
    color: ${({ theme }) => theme.colors.trust};
    font-size: ${({ theme }) => theme.typography.size.xs};
  }
`;

/** Quiz-driven fit notes: labeled qualitative badges, never a percentage. */
function MatchNotes({ pet }: { pet: Pet }) {
  const { completed, answers } = useQuizProfile();
  if (!completed) return null;
  const notes = fitNotes(answers, pet);
  if (notes.length === 0) return null;
  return (
    <FitSection>
      <h2>For your home</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {notes.map((note) => (
          <Badge key={note.text} tone={note.tone === "good" ? "success" : "warning"}>
            {note.tone === "good" ? "✓" : "?"} {note.text}
          </Badge>
        ))}
      </div>
      <Link href="/quiz">Answers changed? Retake the quiz</Link>
    </FitSection>
  );
}

function compatSlot(label: string, value: TriState) {
  const mark = value === true ? "✓" : value === false ? "–" : "?";
  const text =
    value === "unknown" ? `${label} — ask the shelter` : label;
  return (
    <CompatSlot state={value}>
      <span aria-hidden>{mark}</span>
      {text}
    </CompatSlot>
  );
}

export function PetDetail({ pet, verifiedAgo }: { pet: Pet; verifiedAgo: string }) {
  const primaryPhoto = pet.photos[0];
  const breedLabel =
    pet.breed.rawBreedText || (pet.breed.isMixed ? "Mixed breed" : "Breed unknown");
  const gone = pet.status === "adopted" || pet.status === "removed";

  return (
    <>
      {gone ? (
        <CelebrationBanner>
          {pet.name} found their person. Good news: more pets are still looking —{" "}
          <a href={`/search?species=${pet.species}`}>meet more pets like {pet.name}</a>.
        </CelebrationBanner>
      ) : pet.status === "pending" ? (
        <PendingBanner>
          An adoption for {pet.name} is pending — the shelter can confirm current status.
        </PendingBanner>
      ) : null}

      {primaryPhoto ? (
        <Hero adopted={gone}>
          <Image
            src={primaryPhoto.url}
            alt={`${pet.name}, a ${breedLabel}`}
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            priority
          />
        </Hero>
      ) : null}

      <StatGrid>
        <StatTile>
          <dt>Age</dt>
          <dd>{pet.age.group === "unknown" ? "Unknown" : pet.age.group}</dd>
        </StatTile>
        <StatTile>
          <dt>Sex</dt>
          <dd>{pet.sex === "unknown" ? "Unknown" : pet.sex}</dd>
        </StatTile>
        <StatTile>
          <dt>Size</dt>
          <dd>{pet.size === "unknown" ? "Unknown" : pet.size.toUpperCase()}</dd>
        </StatTile>
        <StatTile>
          <dt>Breed</dt>
          <dd>{breedLabel}</dd>
        </StatTile>
      </StatGrid>

      <CompatRow aria-label="Compatibility">
        {compatSlot("Kids", pet.compat.kids)}
        {compatSlot("Dogs", pet.compat.dogs)}
        {compatSlot("Cats", pet.compat.cats)}
        {compatSlot("House-trained", pet.houseTrained)}
      </CompatRow>

      <MatchNotes pet={pet} />

      <OrgCard>
        <OrgName>{pet.organizationName}</OrgName>
        <OrgMeta>
          {[pet.location.city, pet.location.state].filter(Boolean).join(", ")} · via{" "}
          {pet.sourceLabel} · last verified {verifiedAgo}
        </OrgMeta>
        {pet.sourceUrl && !gone ? (
          <ButtonAnchor href={pet.sourceUrl} target="_blank" rel="noopener noreferrer">
            Start adoption at {pet.organizationName} ↗
          </ButtonAnchor>
        ) : null}
        <OrgMeta style={{ marginTop: 12, marginBottom: 0 }}>
          From here, you&apos;re in {pet.organizationName}&apos;s hands — they&apos;re the
          experts on {pet.name}. We never stand between you, and we never charge you.
        </OrgMeta>
      </OrgCard>
    </>
  );
}
