"use client";

import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { fetchSearchPage } from "@/lib/search-client";

/* The filter sheet (DESIGN.md): staged edits + a live "Show N pets" footer —
   the count is the product promise, so it debounces 250ms and never shows a
   stale number. L2 elevation; bottom sheet on mobile, centered card on md+. */

export const SIZE_OPTIONS = ["xs", "s", "m", "l", "xl"] as const;
export const GOODWITH_OPTIONS = ["kids", "dogs", "cats"] as const;

const SIZE_LABELS: Record<(typeof SIZE_OPTIONS)[number], string> = {
  xs: "X-Small",
  s: "Small",
  m: "Medium",
  l: "Large",
  xl: "X-Large",
};

const GOODWITH_LABELS: Record<(typeof GOODWITH_OPTIONS)[number], string> = {
  kids: "Kids",
  dogs: "Dogs",
  cats: "Cats",
};

export interface SheetValues {
  breed: string;
  size: string[];
  sex: "" | "male" | "female";
  goodWith: string[];
  houseTrained: boolean;
  includeUnknownCompat: boolean;
}

export function countActive(v: SheetValues): number {
  return (
    (v.breed ? 1 : 0) +
    (v.size.length ? 1 : 0) +
    (v.sex ? 1 : 0) +
    (v.goodWith.length ? 1 : 0) +
    (v.houseTrained ? 1 : 0) +
    (v.includeUnknownCompat ? 0 : 1)
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.z.overlay};
  background: ${({ theme }) => theme.colors.overlay};
`;

const Panel = styled.div`
  position: fixed;
  z-index: ${({ theme }) => theme.z.modal};
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.surfaceOverlay};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => `${theme.radii.lg} ${theme.radii.lg} 0 0`};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  outline: none;
  ${({ theme }) => theme.mq.motionOk} {
    animation: sheet-in ${({ theme }) =>
      `${theme.motion.duration.slow} ${theme.motion.easing.sheet}`};
    @keyframes sheet-in {
      from {
        transform: translateY(24px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  }
  ${({ theme }) => theme.mq.md} {
    left: 50%;
    right: auto;
    bottom: auto;
    top: 10dvh;
    transform: translateX(-50%);
    width: 480px;
    max-height: 80dvh;
    border-radius: ${({ theme }) => theme.radii.lg};
    ${({ theme }) => theme.mq.motionOk} {
      @keyframes sheet-in {
        from {
          transform: translateX(-50%) translateY(16px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    }
  }
`;

const Body = styled.div`
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.space(5)} ${theme.space(5)} ${theme.space(2)}`};
`;

const SheetTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-variation-settings: ${({ theme }) => theme.typography.displayVariationSmall};
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.display};
  margin: 0 0 ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Group = styled.fieldset`
  border: none;
  padding: 0;
  margin: 0 0 ${({ theme }) => theme.space(5)};
  legend {
    font-size: ${({ theme }) => theme.typography.size.xs};
    font-weight: ${({ theme }) => theme.typography.weight.medium};
    letter-spacing: ${({ theme }) => theme.typography.tracking.caps};
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-bottom: ${({ theme }) => theme.space(2)};
    padding: 0;
  }
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
`;

/* Same chip language as the bar: active = subtle bg + accent border,
   readable accentText — never solid-filled (DESIGN.md). */
const OptionChip = styled.button<{ active?: boolean }>`
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3.5)}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, active }) => (active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, active }) =>
    active ? theme.colors.accentSubtle : theme.colors.surfaceRaised};
  color: ${({ theme, active }) =>
    active ? theme.colors.accentText : theme.colors.textPrimary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-size: ${({ theme }) => theme.typography.size.sm};
  cursor: pointer;
`;

const BreedInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(3)}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 16px; /* iOS zooms inputs under 16px */
`;

const CheckLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;
  input {
    accent-color: ${({ theme }) => theme.colors.accent};
    width: 18px;
    height: 18px;
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceOverlay};
`;

const EMPTY: SheetValues = {
  breed: "",
  size: [],
  sex: "",
  goodWith: [],
  houseTrained: false,
  includeUnknownCompat: true,
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterSheet({
  initial,
  baseParams,
  onApply,
  onClose,
}: {
  initial: SheetValues;
  /** The non-sheet filters (species/age/location) the live count must respect. */
  baseParams: Record<string, string>;
  onApply: (values: SheetValues) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<SheetValues>(initial);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Focus the panel on open, lock body scroll, close on Escape.
  useEffect(() => {
    panelRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Debounced live count of the STAGED filter (250ms per DESIGN.md).
  const [debounced, setDebounced] = useState(values);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(values), 250);
    return () => clearTimeout(t);
  }, [values]);

  const countQuery = useQuery({
    queryKey: ["filter-sheet-count", baseParams, debounced],
    queryFn: () => {
      const params = new URLSearchParams(baseParams);
      if (debounced.breed) params.set("breed", debounced.breed);
      if (debounced.size.length) params.set("size", debounced.size.join(","));
      if (debounced.sex) params.set("sex", debounced.sex);
      if (debounced.goodWith.length) params.set("goodWith", debounced.goodWith.join(","));
      if (debounced.houseTrained) params.set("houseTrained", "true");
      if (!debounced.includeUnknownCompat) params.set("includeUnknownCompat", "false");
      params.set("limit", "1");
      return fetchSearchPage(params);
    },
    staleTime: 60_000,
  });
  const total = countQuery.data?.total;

  return (
    <>
      <Overlay onClick={onClose} />
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="More filters"
        tabIndex={-1}
      >
        <Body>
          <SheetTitle>More filters</SheetTitle>

          <Group>
            <legend>Breed</legend>
            <BreedInput
              type="text"
              maxLength={80}
              placeholder="e.g. shepherd, tabby…"
              value={values.breed}
              onChange={(e) => {
                // Read before the updater runs — currentTarget nulls after dispatch.
                const breed = e.currentTarget.value;
                setValues((v) => ({ ...v, breed }));
              }}
            />
          </Group>

          <Group>
            <legend>Size</legend>
            <ChipRow>
              {SIZE_OPTIONS.map((s) => (
                <OptionChip
                  key={s}
                  active={values.size.includes(s)}
                  aria-pressed={values.size.includes(s)}
                  onClick={() => setValues((v) => ({ ...v, size: toggle(v.size, s) }))}
                >
                  {SIZE_LABELS[s]}
                </OptionChip>
              ))}
            </ChipRow>
          </Group>

          <Group>
            <legend>Sex</legend>
            <ChipRow>
              {(["", "male", "female"] as const).map((s) => (
                <OptionChip
                  key={s || "any"}
                  active={values.sex === s}
                  aria-pressed={values.sex === s}
                  onClick={() => setValues((v) => ({ ...v, sex: s }))}
                >
                  {s === "" ? "Any" : s === "male" ? "Male" : "Female"}
                </OptionChip>
              ))}
            </ChipRow>
          </Group>

          <Group>
            <legend>Good with</legend>
            <ChipRow>
              {GOODWITH_OPTIONS.map((g) => (
                <OptionChip
                  key={g}
                  active={values.goodWith.includes(g)}
                  aria-pressed={values.goodWith.includes(g)}
                  onClick={() => setValues((v) => ({ ...v, goodWith: toggle(v.goodWith, g) }))}
                >
                  {GOODWITH_LABELS[g]}
                </OptionChip>
              ))}
            </ChipRow>
            {values.goodWith.length > 0 ? (
              <CheckLabel style={{ marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={values.includeUnknownCompat}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setValues((v) => ({ ...v, includeUnknownCompat: checked }));
                  }}
                />
                Include pets where it&apos;s not known yet (&ldquo;ask the shelter&rdquo;)
              </CheckLabel>
            ) : null}
          </Group>

          <Group>
            <legend>House-trained</legend>
            <CheckLabel>
              <input
                type="checkbox"
                checked={values.houseTrained}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setValues((v) => ({ ...v, houseTrained: checked }));
                }}
              />
              Only house-trained pets
            </CheckLabel>
          </Group>
        </Body>

        <Footer>
          <Button variant="ghost" onClick={() => setValues(EMPTY)}>
            Reset
          </Button>
          <Button onClick={() => onApply(values)} aria-live="polite">
            {countQuery.isFetching || total === undefined
              ? "Counting…"
              : `Show ${total} ${total === 1 ? "pet" : "pets"}`}
          </Button>
        </Footer>
      </Panel>
    </>
  );
}
