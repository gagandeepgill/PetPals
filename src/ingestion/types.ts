import { z } from "zod";

/**
 * Ingestion contracts. Adapters are the only code that knows a source's wire
 * format; everything downstream consumes zod-validated RawListings.
 */

export const RawListingSchema = z.object({
  externalId: z.string().min(1),
  sourceId: z.string().min(1),
  url: z.string().url().optional(),
  name: z.string().min(1),
  species: z.enum([
    "dog",
    "cat",
    "rabbit",
    "bird",
    "small_furry",
    "reptile",
    "horse",
    "barnyard",
    "other",
  ]),
  breeds: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    mixed: z.boolean().optional(),
  }),
  age: z.enum(["baby", "young", "adult", "senior"]).optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  size: z.enum(["xs", "s", "m", "l", "xl"]).optional(),
  description: z.string().optional(),
  photos: z.array(z.string().url()),
  status: z.enum(["available", "pending", "adopted", "removed"]),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
  }),
  organization: z.object({ externalOrgId: z.string(), name: z.string().optional() }),
  orgInternalAnimalId: z.string().optional(),
  /** Loose source-side attributes/tags; the normalizer maps them to canon. */
  attributes: z.record(z.string(), z.union([z.boolean(), z.string()])).default({}),
  tags: z.array(z.string()).default([]),
  publishedAt: z.string().optional(),
  raw: z.unknown(),
});

export type RawListing = z.infer<typeof RawListingSchema>;

export interface FetchWindow {
  since?: Date;
  full?: boolean;
}

export interface AdapterCtx {
  secrets: (key: string) => string;
  log: (message: string) => void;
  /** Report a payload that failed schema validation; kept whole for repair. */
  quarantine?: (raw: unknown, reason: string) => Promise<void>;
}

export interface SourceAdapter {
  readonly sourceId: string;
  readonly kind: "api" | "widget" | "scrape" | "push";
  /** How often the scheduler runs a full sync of this source. */
  readonly schedule: { intervalMs: number };
  readonly politeness: { maxConcurrent: number; minDelayMs: number };

  healthcheck(ctx: AdapterCtx): Promise<{ ok: boolean; detail?: string }>;
  /** Resumable stream of validated listings. */
  fetchListings(window: FetchWindow, ctx: AdapterCtx): AsyncIterable<RawListing>;
}
