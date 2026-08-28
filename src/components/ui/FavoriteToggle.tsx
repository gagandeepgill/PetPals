"use client";

import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { useState } from "react";
import { useFavorites } from "@/lib/favorites";

/* The one showpiece (see DESIGN.md): 350ms spring pop + ≤6-particle burst,
   tap-only, favorite-direction-only. Unfavorite is a plain fade. */

const pop = keyframes`
  0% { transform: scale(1); }
  30% { transform: scale(0.8); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
`;

const burst = keyframes`
  from { transform: scale(0.2); opacity: 1; }
  to { transform: scale(1); opacity: 0; }
`;

const Button = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.space(1)};
  right: ${({ theme }) => theme.space(1)};
  z-index: 2;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #fff;
  border-radius: ${({ theme }) => theme.radii.pill};

  svg.heart {
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
    transition: fill ${({ theme }) =>
      `${theme.motion.duration.fast} ${theme.motion.easing.standard}`};
  }
  &[aria-pressed="true"] svg.heart {
    fill: ${({ theme }) => theme.colors.favorite};
    stroke: ${({ theme }) => theme.colors.favorite};
  }
  ${({ theme }) => theme.mq.motionOk} {
    &[data-pop="true"] svg.heart {
      animation: ${pop} 350ms ${({ theme }) => theme.motion.easing.spring};
    }
    &[data-pop="true"] svg.burst circle {
      animation: ${burst} 300ms ease-out 200ms both;
    }
  }
`;

const Burst = styled.svg`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  circle {
    fill: ${({ theme }) => theme.colors.favorite};
    opacity: 0;
    transform-origin: center;
  }
`;

const PARTICLES = [
  [22, 6],
  [36, 12],
  [40, 24],
  [33, 36],
  [14, 35],
  [7, 18],
] as const;

export function FavoriteToggle({ petId, petName }: { petId: string; petName: string }) {
  const { isFavorite, toggle } = useFavorites();
  const [popping, setPopping] = useState(false);
  const active = isFavorite(petId);

  return (
    <Button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${petName} from saved pets` : `Save ${petName}`}
      data-pop={popping}
      onClick={(e) => {
        e.preventDefault();
        if (!active) {
          // Cleared on a timer, not onAnimationEnd: the pop ends at 350ms but
          // the burst particles run until ~500ms and must not be cancelled.
          setPopping(true);
          window.setTimeout(() => setPopping(false), 600);
        }
        toggle(petId);
      }}
    >
      <Burst className="burst" viewBox="0 0 44 44" aria-hidden>
        {PARTICLES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.2" />
        ))}
      </Burst>
      <svg
        className="heart"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 21C7 16.5 3 13.2 3 8.9 3 6.2 5.2 4 7.9 4c1.6 0 3.1.8 4.1 2.1C13 4.8 14.5 4 16.1 4 18.8 4 21 6.2 21 8.9c0 4.3-4 7.6-9 12.1z" />
      </svg>
    </Button>
  );
}
