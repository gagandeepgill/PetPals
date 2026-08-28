"use client";

import styled from "@emotion/styled";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/primitives";
import type { PetCardData } from "@/lib/domain/search";

const HeroWrap = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};
  align-items: center;
  padding: ${({ theme }) => `${theme.space(12)} 0 ${theme.space(10)}`};
  ${({ theme }) => theme.mq.md} {
    grid-template-columns: 1.1fr 1fr;
  }
`;

const Headline = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: clamp(2rem, 5vw, ${({ theme }) => theme.typography.size["3xl"]});
  font-weight: ${({ theme }) => theme.typography.weight.display};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 ${({ theme }) => theme.space(4)};
  text-wrap: balance;
  strong {
    color: ${({ theme }) => theme.colors.accent};
    font-weight: inherit;
  }
`;

const Sub = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.lg};
  margin: 0 0 ${({ theme }) => theme.space(6)};
  max-width: 44ch;
`;

/* Loose collage of real listing photos in slightly rotated frames —
   the one thing a template can't fake. */
const Collage = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space(4)};
`;

const Polaroid = styled(Link)<{ tilt: number }>`
  display: block;
  background: ${({ theme }) => theme.colors.surfaceOverlay};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme }) => theme.space(2)};
  text-decoration: none;
  transform: rotate(${({ tilt }) => tilt}deg);
  ${({ theme }) => theme.mq.motionOk} {
    transition: transform ${({ theme }) =>
      `${theme.motion.duration.base} ${theme.motion.easing.standard}`};
    &:hover {
      transform: rotate(0deg) scale(1.03);
    }
  }
`;

const PolaroidFrame = styled.div`
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceSunken};
  img {
    object-fit: cover;
    object-position: center 30%;
  }
`;

const PolaroidCaption = styled.p`
  margin: ${({ theme }) => `${theme.space(2)} 0 0`};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

const TILTS = [-2.5, 1.8, 2.2, -1.6];

export function HomeHero({ total, faces }: { total: number; faces: PetCardData[] }) {
  return (
    <HeroWrap>
      <div>
        <Headline>
          <strong>{total.toLocaleString()}</strong> {total === 1 ? "pet is" : "pets are"} looking
          for someone. Maybe you.
        </Headline>
        <Sub>
          One search across every shelter and rescue we can reach. Browse, save, and when
          you&apos;re ready — the shelter takes it from there.
        </Sub>
        <ButtonLink href="/search">See who&apos;s waiting</ButtonLink>
      </div>
      <Collage aria-label="Recently listed pets">
        {faces.map((pet, i) => (
          <Polaroid key={pet.id} href={`/pets/${pet.id}`} tilt={TILTS[i % TILTS.length] ?? 0}>
            <PolaroidFrame>
              {pet.photo ? (
                <Image src={pet.photo.url} alt={pet.photoAlt} fill sizes="220px" priority={i < 2} />
              ) : null}
            </PolaroidFrame>
            <PolaroidCaption>
              {pet.name}
              {pet.city ? ` · ${pet.city}` : ""}
            </PolaroidCaption>
          </Polaroid>
        ))}
      </Collage>
    </HeroWrap>
  );
}

export const SectionHeading = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 ${({ theme }) => theme.space(4)};
`;

const Steps = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  ${({ theme }) => theme.mq.md} {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Step = styled.li`
  background: ${({ theme }) => theme.colors.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: ${({ theme }) => theme.space(5)};
  margin: 0;
  h3 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: ${({ theme }) => theme.typography.size.md};
    font-weight: ${({ theme }) => theme.typography.weight.display};
    margin: 0 0 ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.colors.trust};
  }
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: ${({ theme }) => theme.typography.size.sm};
  }
`;

export function TrustStrip() {
  return (
    <section aria-labelledby="how-it-works" style={{ padding: "16px 0 48px" }}>
      <SectionHeading id="how-it-works">How this works (it&apos;s simple)</SectionHeading>
      <Steps>
        <Step>
          <h3>1 · We gather</h3>
          <p>
            Listings from rescue networks and local shelters, refreshed daily — one search
            instead of three.
          </p>
        </Step>
        <Step>
          <h3>2 · You browse</h3>
          <p>Filter by what matters to your home, save the ones who stick with you.</p>
        </Step>
        <Step>
          <h3>3 · The shelter takes over</h3>
          <p>
            Adoptions happen at the shelter — we hand you off, they know their animals best.
            We never charge you.
          </p>
        </Step>
      </Steps>
    </section>
  );
}

const CloseWrap = styled.section`
  text-align: center;
  padding: ${({ theme }) => `${theme.space(10)} 0 ${theme.space(16)}`};
  p {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: ${({ theme }) => theme.typography.size.xl};
    font-weight: ${({ theme }) => theme.typography.weight.bold};
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0 0 ${({ theme }) => theme.space(5)};
    text-wrap: balance;
  }
`;

export function CelebrationClose() {
  return (
    <CloseWrap>
      <p>Every listing here comes from a real shelter or rescue. Somebody&apos;s waiting.</p>
      <ButtonLink href="/search">Start looking</ButtonLink>
    </CloseWrap>
  );
}
