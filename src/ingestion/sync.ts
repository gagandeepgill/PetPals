import { createHash } from "node:crypto";
import { getPool } from "../lib/db";
import { NORMALIZER_VERSION, normalizeListing } from "./normalize";
import { isLicensedSource, LocalPhotoStore, processPhoto } from "./photos";
import type { AdapterCtx, RawListing, SourceAdapter } from "./types";

/**
 * One full sync of one source, callable from the CLI (`npm run ingest`) and
 * from the BullMQ worker. Writes an ingest_runs metrics row on every outcome;
 * throws on failure so the caller's retry policy applies.
 */

const MAX_PHOTOS_PER_PET = 6;
const PHOTO_CONCURRENCY = 4;
const photoStore = new LocalPhotoStore();

export interface RunMetrics {
  source: string;
  fetched: number;
  changed: number;
  removed: number;
  quarantined: number;
  durationMs: number;
}

function contentHash(listing: RawListing): string {
  const { raw: _raw, ...salient } = listing;
  return createHash("sha256").update(JSON.stringify(salient)).digest("hex");
}

function buildCtx(source: string, counters: { quarantined: number }): AdapterCtx {
  return {
    secrets: (key) => {
      const value = process.env[key];
      if (!value) throw new Error(`Missing required env var ${key}`);
      return value;
    },
    log: (message) => console.log(`[ingest:${source}] ${message}`),
    quarantine: async (raw, reason) => {
      counters.quarantined++;
      await getPool().query(
        "INSERT INTO ingest_quarantine (source, reason, raw_payload) VALUES ($1, $2, $3)",
        [source, reason, JSON.stringify(raw ?? null)],
      );
    },
  };
}

async function upsertOrganization(listing: RawListing): Promise<string> {
  const pool = getPool();
  const existing = await pool.query<{ organization_id: string }>(
    "SELECT organization_id FROM organization_source_refs WHERE source = $1 AND external_org_id = $2",
    [listing.sourceId, listing.organization.externalOrgId],
  );
  const found = existing.rows[0];
  if (found) return found.organization_id;

  const org = await pool.query<{ id: string }>(
    `INSERT INTO organizations (name, city, state, postal_code, location)
     VALUES ($1, $2, $3, $4,
             CASE WHEN $5::float8 IS NOT NULL AND $6::float8 IS NOT NULL
                  THEN ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography END)
     RETURNING id`,
    [
      listing.organization.name ?? "Unknown organization",
      listing.location.city ?? null,
      listing.location.state ?? null,
      listing.location.postcode ?? null,
      listing.location.lat ?? null,
      listing.location.lon ?? null,
    ],
  );
  const orgId = org.rows[0]!.id;
  await pool.query(
    "INSERT INTO organization_source_refs (organization_id, source, external_org_id) VALUES ($1, $2, $3)",
    [orgId, listing.sourceId, listing.organization.externalOrgId],
  );
  return orgId;
}

async function upsertListing(
  listing: RawListing,
  hash: string,
): Promise<{ listingId: string; changed: boolean }> {
  const pool = getPool();
  const existing = await pool.query<{ id: string; content_hash: string }>(
    `SELECT id, content_hash FROM source_listings
     WHERE source = $1 AND source_site_id IS NOT DISTINCT FROM $2 AND external_id = $3`,
    [listing.sourceId, null, listing.externalId],
  );
  const found = existing.rows[0];

  if (found && found.content_hash === hash) {
    await pool.query(
      "UPDATE source_listings SET last_seen_at = now(), removed_at = NULL WHERE id = $1",
      [found.id],
    );
    return { listingId: found.id, changed: false };
  }

  if (found) {
    await pool.query(
      `UPDATE source_listings SET raw_payload = $2, content_hash = $3, status = $4,
         normalizer_version = $5, last_seen_at = now(), removed_at = NULL
       WHERE id = $1`,
      [found.id, JSON.stringify(listing.raw), hash, listing.status, NORMALIZER_VERSION],
    );
    return { listingId: found.id, changed: true };
  }

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO source_listings
       (source, source_site_id, external_id, external_org_id, org_internal_animal_id,
        url, raw_payload, content_hash, status, normalizer_version)
     VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      listing.sourceId,
      listing.externalId,
      listing.organization.externalOrgId,
      listing.orgInternalAnimalId ?? null,
      listing.url ?? null,
      JSON.stringify(listing.raw),
      hash,
      listing.status,
      NORMALIZER_VERSION,
    ],
  );
  return { listingId: inserted.rows[0]!.id, changed: true };
}

async function upsertPet(listing: RawListing, listingId: string, orgId: string): Promise<string> {
  const pool = getPool();
  const n = normalizeListing(listing);

  const values = [
    n.species, n.name, n.rawBreedText, n.isMixed, n.sex, n.size, n.ageGroup, n.ageConfidence,
    String(n.houseTrained), String(n.spayedNeutered),
    String(n.compat.kids), String(n.compat.dogs), String(n.compat.cats),
    n.traits, n.description, n.status, orgId, listing.sourceId, n.sourceUrl,
    n.postalCode, n.city, n.state, n.lat, n.lon,
  ];

  const link = await pool.query<{ pet_id: string }>(
    "SELECT pet_id FROM pet_source_links WHERE source_listing_id = $1",
    [listingId],
  );
  const existing = link.rows[0];

  let petId: string;
  if (existing) {
    petId = existing.pet_id;
    await pool.query(
      `UPDATE pets SET species=$1, name=$2, raw_breed_text=$3, is_mixed=$4, sex=$5, size=$6,
         age_group=$7, age_confidence=$8, house_trained=$9, spayed_neutered=$10,
         compat_kids=$11, compat_dogs=$12, compat_cats=$13, traits=$14, description=$15,
         status=$16, status_computed_at=now(), organization_id=$17, source_label=$18,
         source_url=$19, postal_code=$20, city=$21, state=$22,
         location = CASE WHEN $23::float8 IS NOT NULL AND $24::float8 IS NOT NULL
                         THEN ST_SetSRID(ST_MakePoint($24, $23), 4326)::geography
                         ELSE location END,
         updated_at = now()
       WHERE id = $25`,
      [...values, petId],
    );
  } else {
    const pet = await pool.query<{ id: string }>(
      `INSERT INTO pets (species, name, raw_breed_text, is_mixed, sex, size, age_group,
         age_confidence, house_trained, spayed_neutered, compat_kids, compat_dogs, compat_cats,
         traits, description, status, organization_id, source_label, source_url,
         postal_code, city, state, location, status_computed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
         CASE WHEN $23::float8 IS NOT NULL AND $24::float8 IS NOT NULL
              THEN ST_SetSRID(ST_MakePoint($24, $23), 4326)::geography END, now())
       RETURNING id`,
      values,
    );
    petId = pet.rows[0]!.id;
    await pool.query(
      `INSERT INTO pet_source_links (pet_id, source_listing_id, match_method)
       VALUES ($1, $2, 'exact_external_id')`,
      [petId, listingId],
    );
  }

  const { rows: existingPhotos } = await pool.query<{
    original_url: string;
    url: string;
    phash: string;
    blur_data_url: string | null;
    width: number | null;
    height: number | null;
  }>(
    `SELECT original_url, url, phash, blur_data_url, width, height
     FROM pet_photos WHERE pet_id = $1 AND source_listing_id = $2`,
    [petId, listingId],
  );
  const processedCache = new Map(existingPhotos.map((p) => [p.original_url, p]));

  await pool.query("DELETE FROM pet_photos WHERE pet_id = $1 AND source_listing_id = $2", [
    petId,
    listingId,
  ]);

  const rehost = isLicensedSource(listing.sourceId);
  const urls = n.photos.slice(0, MAX_PHOTOS_PER_PET);
  // Fetch/process uncached photos with bounded concurrency; inserts stay
  // ordered and sequential (they're cheap — the network work is the cost).
  const rows = await mapWithConcurrency(urls, PHOTO_CONCURRENCY, async (originalUrl) => {
    const cached = processedCache.get(originalUrl);
    if (cached && cached.phash !== "") {
      return {
        originalUrl,
        url: cached.url,
        phash: cached.phash,
        blur: cached.blur_data_url,
        width: cached.width,
        height: cached.height,
      };
    }
    const processed = await processPhoto(originalUrl, { rehost, store: photoStore });
    return processed
      ? {
          originalUrl,
          url: processed.url,
          phash: processed.phash,
          blur: processed.blurDataURL,
          width: processed.width,
          height: processed.height,
        }
      : { originalUrl, url: originalUrl, phash: "", blur: null, width: null, height: null };
  });
  for (const [index, row] of rows.entries()) {
    await pool.query(
      `INSERT INTO pet_photos
         (pet_id, source_listing_id, url, original_url, phash, blur_data_url,
          width, height, is_primary, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [petId, listingId, row.url, row.originalUrl, row.phash, row.blur, row.width, row.height, index === 0, index],
    );
  }
  return petId;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

async function suppressUnseen(sourceId: string, runStart: Date): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query<{ pet_id: string }>(
    `UPDATE source_listings sl SET status = 'removed', removed_at = now()
     FROM pet_source_links l
     WHERE l.source_listing_id = sl.id AND sl.source = $1 AND sl.last_seen_at < $2
       AND sl.status <> 'removed'
     RETURNING l.pet_id`,
    [sourceId, runStart],
  );
  if (rows.length) {
    await pool.query(
      `UPDATE pets SET status = 'removed', status_computed_at = now(), updated_at = now()
       WHERE id = ANY($1)`,
      [rows.map((r) => r.pet_id)],
    );
  }
  return rows.length;
}

async function revalidate(petIds: string[], log: (m: string) => void): Promise<void> {
  const appUrl = process.env.APP_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!appUrl || !secret || petIds.length === 0) return;
  await fetch(`${appUrl}/api/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ tags: ["pets", ...petIds.map((id) => `pet:${id}`)] }),
  }).catch((err) => log(`revalidate failed: ${err}`));
}

async function recordRun(
  source: string,
  startedAt: Date,
  ok: boolean,
  metrics: Omit<RunMetrics, "source" | "durationMs">,
  error?: string,
): Promise<void> {
  await getPool().query(
    `INSERT INTO ingest_runs (source, started_at, ok, fetched, changed, removed, quarantined, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [source, startedAt, ok, metrics.fetched, metrics.changed, metrics.removed, metrics.quarantined, error ?? null],
  );
}

export async function syncSource(adapter: SourceAdapter): Promise<RunMetrics> {
  const startedAt = new Date();
  const counters = { quarantined: 0 };
  const ctx = buildCtx(adapter.sourceId, counters);

  let fetched = 0;
  let changed = 0;
  let removed = 0;
  const changedPets: string[] = [];

  try {
    const health = await adapter.healthcheck(ctx);
    if (!health.ok) {
      throw new Error(`healthcheck failed: ${health.detail ?? "unknown"}`);
    }

    for await (const listing of adapter.fetchListings({ full: true }, ctx)) {
      fetched++;
      const orgId = await upsertOrganization(listing);
      const { listingId, changed: didChange } = await upsertListing(listing, contentHash(listing));
      if (didChange) {
        changed++;
        changedPets.push(await upsertPet(listing, listingId, orgId));
      }
    }

    removed = await suppressUnseen(adapter.sourceId, startedAt);
    await revalidate(changedPets, ctx.log);
    await recordRun(adapter.sourceId, startedAt, true, {
      fetched,
      changed,
      removed,
      quarantined: counters.quarantined,
    });
  } catch (err) {
    await recordRun(
      adapter.sourceId,
      startedAt,
      false,
      { fetched, changed, removed, quarantined: counters.quarantined },
      String(err),
    ).catch(() => undefined);
    throw err;
  }

  const durationMs = Date.now() - startedAt.getTime();
  ctx.log(
    `fetched=${fetched} changed=${changed} removed=${removed} quarantined=${counters.quarantined} in ${Math.round(durationMs / 1000)}s`,
  );
  return { source: adapter.sourceId, fetched, changed, removed, quarantined: counters.quarantined, durationMs };
}
