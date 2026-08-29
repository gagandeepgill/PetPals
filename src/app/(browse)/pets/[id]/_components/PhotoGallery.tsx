"use client";

import styled from "@emotion/styled";
import Image from "next/image";
import { useState } from "react";
import type { Pet } from "@/lib/domain/pet";

/* Detail-page media: hero + thumbnail rail. Every ingested photo is shown —
   208 of the current 365 pets carry 2-6 photos that were previously wasted.
   Thumbs only render when there's more than one. */

const Hero = styled.div<{ adopted?: boolean }>`
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceSunken};
  margin-bottom: ${({ theme }) => theme.space(2)};
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
    border: 1px solid ${({ theme }) => theme.colors.imageOutline};
  }
  ${({ theme }) => theme.mq.md} {
    aspect-ratio: 16 / 9;
  }
`;

const Rail = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Thumb = styled.button<{ active: boolean }>`
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  padding: 0;
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.surfaceSunken};
  border: 2px solid
    ${({ theme, active }) => (active ? theme.colors.accent : theme.colors.border)};
  opacity: ${({ active }) => (active ? 1 : 0.75)};
  img {
    object-fit: cover;
    object-position: center 30%;
  }
  ${({ theme }) => theme.mq.motionOk} {
    transition: opacity ${({ theme }) =>
      `${theme.motion.duration.fast} ${theme.motion.easing.standard}`};
  }
  &:hover {
    opacity: 1;
  }
`;

export function PhotoGallery({
  photos,
  name,
  breedLabel,
  adopted,
}: {
  photos: Pet["photos"];
  name: string;
  breedLabel: string;
  adopted: boolean;
}) {
  const [index, setIndex] = useState(0);
  const current = photos[Math.min(index, photos.length - 1)];
  if (!current) return null;

  return (
    <div>
      <Hero adopted={adopted}>
        <Image
          key={current.id}
          src={current.url}
          alt={`${name}, a ${breedLabel} — photo ${index + 1} of ${photos.length}`}
          fill
          sizes="(max-width: 768px) 100vw, 900px"
          priority={index === 0}
          {...(current.blurDataURL
            ? { placeholder: "blur" as const, blurDataURL: current.blurDataURL }
            : {})}
        />
      </Hero>
      {photos.length > 1 ? (
        <Rail role="group" aria-label={`Photos of ${name}`}>
          {photos.map((photo, i) => (
            <Thumb
              key={photo.id}
              active={i === index}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            >
              <Image src={photo.url} alt="" fill sizes="72px" />
            </Thumb>
          ))}
        </Rail>
      ) : null}
    </div>
  );
}
