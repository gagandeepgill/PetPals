"use client";

import styled from "@emotion/styled";
import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useState } from "react";
import { RADII } from "@/lib/domain/search";
import { formatRadius, isLikelyCanada } from "@/lib/units";

const SPECIES_OPTIONS = ["dog", "cat", "rabbit", "bird", "other"] as const;
const AGE_OPTIONS = ["baby", "young", "adult", "senior"] as const;
const SORT_OPTIONS = ["freshness", "distance"] as const;

/* Chip rows scroll horizontally on small screens; a token-colored edge fade
   (never a literal — dark mode must fade correctly) signals the overflow. */
const Bar = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(3)} 0`};
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
  &::-webkit-scrollbar {
    display: none;
  }
  > * {
    flex-shrink: 0;
    scroll-snap-align: start;
  }
  ${({ theme }) => theme.mq.md} {
    flex-wrap: wrap;
    overflow-x: visible;
  }
`;

const FadeEdge = styled.div`
  position: relative;
  &::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 40px;
    pointer-events: none;
    background: linear-gradient(to right, transparent, ${({ theme }) => theme.colors.surface});
  }
  ${({ theme }) => theme.mq.md} {
    &::after {
      display: none;
    }
  }
`;

const Chip = styled.button<{ active?: boolean }>`
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3.5)}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, active }) => (active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, active }) =>
    active ? theme.colors.accentSubtle : theme.colors.surfaceRaised};
  /* accentText, not accent: #E07A5F on accentSubtle is 2.45:1 (issue #22). */
  color: ${({ theme, active }) => (active ? theme.colors.accentText : theme.colors.textPrimary)};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-size: ${({ theme }) => theme.typography.size.sm};
  cursor: pointer;
`;

const Field = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  width: 90px;
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3)}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Select = styled.select`
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(2)}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const AGE_LABELS: Record<(typeof AGE_OPTIONS)[number], string> = {
  baby: "Baby",
  young: "Young",
  adult: "Adult",
  senior: "Senior",
};

/**
 * URL is the only filter store (shareable, back-button-safe). Changing any
 * filter drops the cursor (page position is meaningless under a new
 * predicate) AND the map bbox — a viewport captured under the old filters
 * would silently constrain the new search.
 */
export function FilterBar() {
  const [geoState, setGeoState] = useState<"idle" | "asking" | "denied">("idle");
  const [filters, setFilters] = useQueryStates(
    {
      species: parseAsStringLiteral(SPECIES_OPTIONS),
      ageGroup: parseAsArrayOf(parseAsStringLiteral(AGE_OPTIONS)),
      zip: parseAsString,
      lat: parseAsFloat,
      lon: parseAsFloat,
      radius: parseAsNumberLiteral(RADII).withDefault(50),
      sort: parseAsStringLiteral(SORT_OPTIONS).withDefault("freshness"),
      cursor: parseAsString,
      bbox: parseAsString,
    },
    // shallow: filter changes refetch through the client query cache; the RSC
    // page only re-renders on hard navigation.
    { shallow: true, clearOnDefault: true, throttleMs: 300 },
  );

  const hasOrigin = filters.lat !== null && filters.lon !== null;
  const metric = hasOrigin && isLikelyCanada(filters.lat!, filters.lon!);

  const requestNearMe = () => {
    if (hasOrigin) {
      // Toggle off — and distance sort is meaningless without an origin.
      void setFilters({
        lat: null,
        lon: null,
        cursor: null,
        ...(filters.zip ? {} : { sort: "freshness" }),
      });
      return;
    }
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      return;
    }
    setGeoState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("idle");
        // ~1km precision is plenty for a >=10mi radius, and keeps the exact
        // position out of the (shareable) URL.
        void setFilters({
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lon: Math.round(pos.coords.longitude * 100) / 100,
          sort: "distance",
          cursor: null,
          bbox: null,
        });
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const toggleAge = (age: (typeof AGE_OPTIONS)[number]) => {
    const current = filters.ageGroup ?? [];
    const next = current.includes(age) ? current.filter((a) => a !== age) : [...current, age];
    void setFilters({ ageGroup: next.length ? next : null, cursor: null, bbox: null });
  };

  return (
    <FadeEdge role="group" aria-label="Filter pets">
      <Bar>
        <Chip
          active={filters.species === null}
          aria-pressed={filters.species === null}
          onClick={() => void setFilters({ species: null, cursor: null, bbox: null })}
        >
          All pets
        </Chip>
        {SPECIES_OPTIONS.map((s) => (
          <Chip
            key={s}
            active={filters.species === s}
            aria-pressed={filters.species === s}
            onClick={() => void setFilters({ species: s, cursor: null, bbox: null })}
          >
            {s === "other" ? "Other" : `${s[0]?.toUpperCase()}${s.slice(1)}s`}
          </Chip>
        ))}
        <Chip
          active={hasOrigin}
          aria-pressed={hasOrigin}
          onClick={requestNearMe}
          disabled={geoState === "asking"}
          aria-label={hasOrigin ? "Clear near-me filter" : "Show pets near your location"}
        >
          {geoState === "asking" ? "Locating…" : hasOrigin ? "Near you ✕" : "📍 Near me"}
        </Chip>
        {geoState === "denied" ? (
          <Field role="status">Location unavailable — try the map or a ZIP instead.</Field>
        ) : null}
        {filters.bbox ? (
          <Chip
            active
            onClick={() => void setFilters({ bbox: null, cursor: null })}
            aria-label="Clear map area filter"
          >
            Map area ✕
          </Chip>
        ) : null}
      </Bar>
      <Bar>
        {AGE_OPTIONS.map((age) => (
          <Chip
            key={age}
            active={filters.ageGroup?.includes(age) ?? false}
            aria-pressed={filters.ageGroup?.includes(age) ?? false}
            onClick={() => toggleAge(age)}
          >
            {AGE_LABELS[age]}
          </Chip>
        ))}
        <Field>
          ZIP
          <Input
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="95814"
            defaultValue={filters.zip ?? ""}
            onBlur={(e) => {
              const zip = e.currentTarget.value;
              void setFilters({ zip: /^\d{5}$/.test(zip) ? zip : null, cursor: null, bbox: null });
            }}
          />
        </Field>
        <Field>
          Within
          <Select
            value={filters.radius}
            onChange={(e) =>
              void setFilters({
                radius: Number(e.currentTarget.value) as (typeof RADII)[number],
                cursor: null,
                bbox: null,
              })
            }
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                {formatRadius(r, metric)}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          Sort
          <Select
            value={filters.sort}
            onChange={(e) =>
              void setFilters({
                sort: e.currentTarget.value as (typeof SORT_OPTIONS)[number],
                cursor: null,
              })
            }
          >
            <option value="freshness">Newest</option>
            <option value="distance" disabled={!filters.zip && !hasOrigin}>
              Distance{filters.zip || hasOrigin ? "" : " (enter ZIP or use Near me)"}
            </option>
          </Select>
        </Field>
      </Bar>
    </FadeEdge>
  );
}
