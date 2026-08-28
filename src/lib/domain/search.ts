import { z } from "zod";
import type { AgeGroup, PetStatus, Species } from "./pet";

export const RADII = [10, 25, 50, 100] as const;

/**
 * The search contract. This schema is simultaneously the route-handler
 * validator, the RSC searchParams parser, and the source of the nuqs parsers.
 */
export const SearchFilterSchema = z
  .object({
    species: z.enum(["dog", "cat", "rabbit", "bird", "other"]).optional(),
    breed: z.string().max(80).optional(),
    ageGroup: z.enum(["baby", "young", "adult", "senior"]).array().max(4).optional(),
    size: z.enum(["xs", "s", "m", "l", "xl"]).array().optional(),
    sex: z.enum(["male", "female"]).optional(),
    zip: z
      .string()
      .regex(/^\d{5}$/)
      .optional(),
    radius: z.coerce
      .number()
      .pipe(z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]))
      .default(50),
    energy: z.enum(["low", "moderate", "high", "very_high"]).array().optional(),
    houseTrained: z.coerce.boolean().optional(),
    coat: z.enum(["hairless", "short", "medium", "long", "wire", "curly"]).array().optional(),
    goodWith: z.enum(["kids", "dogs", "cats"]).array().optional(),
    /** Tri-state semantics: "unknown" compat matches by default ("Ask the shelter"). */
    includeUnknownCompat: z.coerce.boolean().default(true),
    /** "minLon,minLat,maxLon,maxLat" — written by the map's moveEnd, read by providers. */
    bbox: z
      .string()
      .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
      .optional(),
    sort: z.enum(["distance", "freshness"]).default("freshness"),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(24),
  })
  .refine((q) => q.sort !== "distance" || q.zip, {
    message: "distance sort requires zip",
    path: ["sort"],
  });

export type SearchFilter = z.infer<typeof SearchFilterSchema>;

export function parseBbox(
  bbox: string | undefined,
): { minLon: number; minLat: number; maxLon: number; maxLat: number } | null {
  if (!bbox) return null;
  const parts = bbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
  return { minLon, minLat, maxLon, maxLat };
}

/** Hydrated, card-ready projection served to the grid. */
export interface PetCardData {
  id: string;
  name: string;
  species: Species;
  ageGroup: AgeGroup;
  ageLabel: string;
  breedLabel: string;
  distanceMi: number | null;
  city: string | null;
  state: string | null;
  orgName: string;
  sourceLabel: string;
  status: PetStatus;
  listedAt: string;
  photo: { url: string; blurDataURL: string | null } | null;
  photoAlt: string;
  lat: number | null;
  lon: number | null;
}

export interface SearchResponse {
  results: PetCardData[];
  facets: Record<string, Record<string, number>>;
  nextCursor: string | null;
  /** Approximate; labeled as such in the UI. */
  total: number;
}

/**
 * Parse Next.js searchParams (string | string[] | undefined values) into a
 * SearchFilter, dropping invalid fields rather than failing the page.
 */
export function parseSearchParams(
  params: Record<string, string | string[] | undefined>,
): SearchFilter {
  const arr = (v: string | string[] | undefined) =>
    v === undefined ? undefined : Array.isArray(v) ? v : v.split(",");
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const candidate = {
    species: one(params.species),
    breed: one(params.breed),
    ageGroup: arr(params.ageGroup),
    size: arr(params.size),
    sex: one(params.sex),
    zip: one(params.zip),
    radius: one(params.radius),
    energy: arr(params.energy),
    houseTrained: one(params.houseTrained),
    coat: arr(params.coat),
    goodWith: arr(params.goodWith),
    includeUnknownCompat: one(params.includeUnknownCompat),
    bbox: one(params.bbox),
    sort: one(params.sort),
    cursor: one(params.cursor),
    limit: one(params.limit),
  };

  const parsed = SearchFilterSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  return SearchFilterSchema.parse({});
}

export function encodeCursor(sortValue: string, id: string): string {
  return Buffer.from(JSON.stringify([sortValue, id])).toString("base64url");
}

export function decodeCursor(cursor: string): { sortValue: string; id: string } | null {
  try {
    const [sortValue, id] = JSON.parse(Buffer.from(cursor, "base64url").toString()) as [
      string,
      string,
    ];
    if (typeof sortValue !== "string" || typeof id !== "string") return null;
    return { sortValue, id };
  } catch {
    return null;
  }
}
