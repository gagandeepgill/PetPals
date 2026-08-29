"use client";

import styled from "@emotion/styled";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink, Muted } from "@/components/ui/primitives";
import { PetPhotoFallback } from "@/components/ui/PetPhotoFallback";
import { parseSearchParams } from "@/lib/domain/search";
import { useFavorites } from "@/lib/favorites";
import { filterToParams, petKeys } from "@/lib/query-keys";
import { fetchSearchPage } from "@/lib/search-client";

/* Discover mode (DESIGN.md): a SECONDARY browsing mode, never the default.
   Right-swipe = save — no "match" reciprocity fiction. Buttons exist for
   everyone; swipe is never the only gesture. Drag values flow through
   imperative CSS variables — never Emotion props (class-per-frame). */

const SWIPE_DISMISS_PX = 120;
const SWIPE_VELOCITY = 0.5; // px/ms

const Stage = styled.div`
  position: relative;
  max-width: 400px;
  margin: 0 auto;
  aspect-ratio: 4 / 5.4;
`;

const DeckCard = styled.div<{ depth: number; leaving: "left" | "right" | null }>`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceSunken};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.md};
  touch-action: pan-y;
  /* Consumed once in static CSS; values driven imperatively during drag. */
  transform: translateX(var(--drag-x, 0px)) rotate(var(--drag-rot, 0deg))
    scale(${({ depth }) => 1 - depth * 0.04}) translateY(${({ depth }) => depth * 10}px);
  z-index: ${({ depth }) => 3 - depth};
  ${({ theme }) => theme.mq.motionOk} {
    transition: ${({ leaving }) =>
      leaving ? "transform 320ms cubic-bezier(0.2, 0, 0, 1), opacity 320ms" : "none"};
  }
  ${({ leaving }) =>
    leaving === "left"
      ? "transform: translateX(-130%) rotate(-16deg); opacity: 0;"
      : leaving === "right"
        ? "transform: translateX(130%) rotate(16deg); opacity: 0;"
        : ""}
  img {
    object-fit: cover;
    object-position: center 30%;
  }
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(rgba(224, 122, 95, 0.04) 55%, rgba(20, 14, 10, 0.55));
  }
`;

const CardInfo = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: ${({ theme }) => theme.space(5)};
  color: #fff9f5;
  h2 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: ${({ theme }) => theme.typography.size.xl};
    font-weight: ${({ theme }) => theme.typography.weight.display};
    margin: 0 0 ${({ theme }) => theme.space(1)};
  }
  p {
    margin: 0;
    font-size: ${({ theme }) => theme.typography.size.sm};
    opacity: 0.92;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => `${theme.space(6)} 0`};
`;

const RoundButton = styled.button<{ variant?: "save" }>`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1.5px solid
    ${({ theme, variant }) => (variant === "save" ? theme.colors.favorite : theme.colors.border)};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  color: ${({ theme, variant }) =>
    variant === "save" ? theme.colors.favorite : theme.colors.textPrimary};
  font-size: 22px;
  cursor: pointer;
  display: grid;
  place-items: center;
  ${({ theme }) => theme.mq.motionOk} {
    transition: transform ${({ theme }) =>
      `${theme.motion.duration.fast} ${theme.motion.easing.standard}`};
    &:active {
      transform: scale(0.92);
    }
  }
`;

const DoneCard = styled.div`
  border: 1.5px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space(10)};
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  justify-items: center;
`;

export function SwipeDeck() {
  const searchParams = useSearchParams();
  const filter = useMemo(
    () => parseSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const query = useInfiniteQuery({
    queryKey: petKeys.search(filter),
    queryFn: ({ pageParam }) => fetchSearchPage(filterToParams(filter, pageParam)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
  });
  const pets = useMemo(() => query.data?.pages.flatMap((p) => p.results) ?? [], [query.data]);

  const { isFavorite, toggle } = useFavorites();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; lastX: number; lastT: number } | null>(null);

  // Top up the deck before it runs dry.
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const remaining = pets.length - index;
  useEffect(() => {
    if (remaining < 6 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [remaining, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const resetVars = () => {
    const el = topRef.current;
    if (!el) return;
    el.style.setProperty("--drag-x", "0px");
    el.style.setProperty("--drag-rot", "0deg");
  };

  const advance = (direction: "left" | "right") => {
    if (leaving) return;
    const pet = pets[index];
    if (direction === "right" && pet && !isFavorite(pet.id)) toggle(pet.id);
    if (reducedMotion) {
      resetVars();
      setIndex((i) => i + 1);
      return;
    }
    setLeaving(direction);
  };

  const onLeaveDone = () => {
    if (!leaving) return;
    resetVars();
    setLeaving(null);
    setIndex((i) => i + 1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (leaving) return;
    drag.current = { pointerId: e.pointerId, startX: e.clientX, lastX: e.clientX, lastT: e.timeStamp };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = topRef.current;
    if (!d || !el || d.pointerId !== e.pointerId || reducedMotion) return;
    const dx = e.clientX - d.startX;
    el.style.setProperty("--drag-x", `${dx}px`);
    el.style.setProperty("--drag-rot", `${dx / 20}deg`);
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    const el = topRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.startX;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    const velocity = Math.abs(e.clientX - d.lastX) / dt;
    if (Math.abs(dx) > SWIPE_DISMISS_PX || velocity > SWIPE_VELOCITY) {
      advance(dx > 0 ? "right" : "left");
    } else {
      resetVars();
    }
  };

  if (query.status === "pending") {
    return <Muted style={{ textAlign: "center", padding: "64px 0" }}>Shuffling the deck…</Muted>;
  }

  if (index >= pets.length) {
    return (
      <DoneCard>
        <p style={{ fontSize: "1.25rem" }}>
          You&apos;ve met everyone {filter.species ? "in this crowd" : "nearby"} — for now.
        </p>
        <p>New pets arrive every day. Your saves are waiting under Saved.</p>
        <div style={{ display: "flex", gap: 12 }}>
          <ButtonLink href="/favorites">See saved pets</ButtonLink>
          <ButtonLink href="/search" variant="secondary">
            Back to search
          </ButtonLink>
        </div>
      </DoneCard>
    );
  }

  const visible = pets.slice(index, index + 3);
  const top = pets[index]!;

  return (
    <>
      <Stage>
        {visible
          .map((pet, depth) => (
            <DeckCard
              key={pet.id}
              depth={depth}
              leaving={depth === 0 ? leaving : null}
              ref={depth === 0 ? topRef : undefined}
              onPointerDown={depth === 0 ? onPointerDown : undefined}
              onPointerMove={depth === 0 ? onPointerMove : undefined}
              onPointerUp={depth === 0 ? onPointerUp : undefined}
              onPointerCancel={depth === 0 ? onPointerUp : undefined}
              onTransitionEnd={depth === 0 ? onLeaveDone : undefined}
            >
              {pet.photo ? (
                <Image
                  src={pet.photo.url}
                  alt={pet.photoAlt}
                  fill
                  sizes="400px"
                  priority={depth === 0}
                  draggable={false}
                />
              ) : (
                <PetPhotoFallback name={pet.name} />
              )}
              <CardInfo>
                <h2>
                  <Link href={`/pets/${pet.id}`}>{pet.name}</Link>
                </h2>
                <p>
                  {[pet.ageLabel, pet.breedLabel, [pet.city, pet.state].filter(Boolean).join(", ")]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p>{pet.orgName}</p>
              </CardInfo>
            </DeckCard>
          ))
          .reverse()}
      </Stage>
      <Controls>
        <RoundButton
          aria-label="Go back to the previous pet"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ↩
        </RoundButton>
        <RoundButton aria-label={`Pass on ${top.name}`} onClick={() => advance("left")}>
          ✕
        </RoundButton>
        <RoundButton
          variant="save"
          aria-label={`Save ${top.name}`}
          onClick={() => advance("right")}
        >
          {isFavorite(top.id) ? "♥" : "♡"}
        </RoundButton>
      </Controls>
      <Muted style={{ textAlign: "center" }}>
        Swipe right to save, left to pass — or just use the buttons. Tap a name for the full story.
      </Muted>
    </>
  );
}
