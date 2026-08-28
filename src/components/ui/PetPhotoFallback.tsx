"use client";

import styled from "@emotion/styled";

/* DESIGN.md no-photo fallback: warm tile + line-drawn paw + the pet's
   initial — never a gray broken-image box, never an empty frame. */

const Tile = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: ${({ theme }) => theme.space(2)};
  background: ${({ theme }) => theme.colors.surfaceSunken};
  color: ${({ theme }) => theme.colors.accent};
  span {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: ${({ theme }) => theme.typography.size["3xl"]};
    font-weight: ${({ theme }) => theme.typography.weight.display};
    opacity: 0.75;
  }
  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: ${({ theme }) => theme.typography.size.xs};
  }
`;

function PawIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <ellipse cx="12" cy="16.5" rx="4.4" ry="3.6" />
      <circle cx="6.2" cy="10.5" r="1.9" />
      <circle cx="10" cy="7.4" r="1.9" />
      <circle cx="14" cy="7.4" r="1.9" />
      <circle cx="17.8" cy="10.5" r="1.9" />
    </svg>
  );
}

export function PetPhotoFallback({ name }: { name: string }) {
  return (
    <Tile aria-hidden>
      <PawIcon />
      <span>{(name[0] ?? "?").toUpperCase()}</span>
      <small>Photos don&apos;t do them justice — meet them</small>
    </Tile>
  );
}
