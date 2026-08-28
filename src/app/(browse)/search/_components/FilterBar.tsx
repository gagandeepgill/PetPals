"use client";

import styled from "@emotion/styled";
import {
  parseAsArrayOf,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { RADII } from "@/lib/domain/search";

const SPECIES_OPTIONS = ["dog", "cat", "rabbit", "bird", "other"] as const;
const AGE_OPTIONS = ["baby", "young", "adult", "senior"] as const;
const SORT_OPTIONS = ["freshness", "distance"] as const;

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(4)} 0`};
`;

const Chip = styled.button<{ active?: boolean }>`
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3.5)}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, active }) => (active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, active }) =>
    active ? theme.colors.accentSubtle : theme.colors.surfaceRaised};
  color: ${({ theme, active }) => (active ? theme.colors.accent : theme.colors.textPrimary)};
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
 * URL is the only filter store (shareable, back-button-safe); shallow:false so
 * the RSC search page re-renders with each change. Changing any filter drops
 * the cursor — page position is meaningless under a new predicate.
 */
export function FilterBar() {
  const [filters, setFilters] = useQueryStates(
    {
      species: parseAsStringLiteral(SPECIES_OPTIONS),
      ageGroup: parseAsArrayOf(parseAsStringLiteral(AGE_OPTIONS)),
      zip: parseAsString,
      radius: parseAsNumberLiteral(RADII).withDefault(50),
      sort: parseAsStringLiteral(SORT_OPTIONS).withDefault("freshness"),
      cursor: parseAsString,
    },
    { shallow: false, clearOnDefault: true, throttleMs: 300 },
  );

  const toggleAge = (age: (typeof AGE_OPTIONS)[number]) => {
    const current = filters.ageGroup ?? [];
    const next = current.includes(age) ? current.filter((a) => a !== age) : [...current, age];
    void setFilters({ ageGroup: next.length ? next : null, cursor: null });
  };

  return (
    <div role="group" aria-label="Filter pets">
      <Bar>
        <Chip
          active={filters.species === null}
          aria-pressed={filters.species === null}
          onClick={() => void setFilters({ species: null, cursor: null })}
        >
          All pets
        </Chip>
        {SPECIES_OPTIONS.map((s) => (
          <Chip
            key={s}
            active={filters.species === s}
            aria-pressed={filters.species === s}
            onClick={() => void setFilters({ species: s, cursor: null })}
          >
            {s === "other" ? "Other" : `${s[0]?.toUpperCase()}${s.slice(1)}s`}
          </Chip>
        ))}
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
              void setFilters({ zip: /^\d{5}$/.test(zip) ? zip : null, cursor: null });
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
              })
            }
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} mi
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
            <option value="distance" disabled={!filters.zip}>
              Distance{filters.zip ? "" : " (enter ZIP)"}
            </option>
          </Select>
        </Field>
      </Bar>
    </div>
  );
}
