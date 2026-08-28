import type { Pool } from "pg";
import { ADAPTERS } from "../ingestion/adapters";
import { hammingDistance } from "../ingestion/photos";
import type { PairScore } from "./score";

/**
 * Merge execution. A merge is never destructive of provenance: listings and
 * raw payloads are untouched; links move to the winner, the loser projection
 * row is deleted, and merge_events records everything needed to un-merge
 * (delete the moved links, re-materialize from raw payloads).
 */

const SOURCE_TRUST: Record<string, number> = {
  rescuegroups: 2,
  asm3: 2,
  shelterluv: 2,
  petango: 2,
  petfinder: 2,
  scrape: 1,
};

export async function pickWinner(pool: Pool, petA: string, petB: string): Promise<[string, string]> {
  const { rows } = await pool.query<{ pet_id: string; source: string; last_seen_at: Date }>(
    `SELECT l.pet_id, sl.source, sl.last_seen_at
     FROM pet_source_links l JOIN source_listings sl ON sl.id = l.source_listing_id
     WHERE l.pet_id = ANY($1)`,
    [[petA, petB]],
  );
  const rank = (petId: string) => {
    const mine = rows.filter((r) => r.pet_id === petId);
    const trust = Math.max(0, ...mine.map((r) => SOURCE_TRUST[r.source] ?? 1));
    const recency = Math.max(0, ...mine.map((r) => r.last_seen_at.getTime()));
    return [trust, recency] as const;
  };
  const [trustA, recencyA] = rank(petA);
  const [trustB, recencyB] = rank(petB);
  if (trustA !== trustB) return trustA > trustB ? [petA, petB] : [petB, petA];
  return recencyA >= recencyB ? [petA, petB] : [petB, petA];
}

/** A listing is "fresh" within 3x its source's sync interval (worst case:
 *  two missed runs), defaulting to 72h for sources not in the registry. */
function freshnessCase(): { sql: string; params: string[] } {
  const cases = ADAPTERS.map(
    (a, i) => `WHEN sl.source = $${i + 2} THEN make_interval(secs => ${Math.round((a.schedule.intervalMs * 3) / 1000)})`,
  ).join(" ");
  return {
    sql: `CASE ${cases} ELSE interval '72 hours' END`,
    params: ADAPTERS.map((a) => a.sourceId),
  };
}

/** Pessimistic status over fresh listings: adopted > pending > available. */
export async function reconcileStatus(pool: Pool, petId: string): Promise<void> {
  const fresh = freshnessCase();
  await pool.query(
    `UPDATE pets p SET
       status = COALESCE((
         SELECT CASE
           WHEN bool_or(sl.status = 'adopted') THEN 'adopted'
           WHEN bool_or(sl.status = 'pending') THEN 'pending'
           WHEN bool_or(sl.status = 'available') THEN 'available'
           ELSE 'removed'
         END
         FROM pet_source_links l
         JOIN source_listings sl ON sl.id = l.source_listing_id
         WHERE l.pet_id = p.id AND sl.last_seen_at > now() - (${fresh.sql})
       ), 'removed'),
       status_computed_at = now(),
       updated_at = now()
     WHERE p.id = $1`,
    [petId, ...fresh.params],
  );
}

export async function mergePets(
  pool: Pool,
  winner: string,
  loser: string,
  method: "exact_org_animal_id" | "scored_auto" | "manual",
  pair?: PairScore,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const moved = await client.query<{ source_listing_id: string }>(
      "UPDATE pet_source_links SET pet_id = $1 WHERE pet_id = $2 RETURNING source_listing_id",
      [winner, loser],
    );
    await client.query("UPDATE pet_photos SET pet_id = $1 WHERE pet_id = $2", [winner, loser]);

    // Survivorship on the projection: longest description; asserted values
    // fill the winner's unknowns (tri-states AND scalar facts); traits union.
    await client.query(
      `UPDATE pets w SET
         description = CASE
           WHEN l.description IS NOT NULL
                AND length(coalesce(l.description,'')) > length(coalesce(w.description,''))
           THEN l.description ELSE w.description END,
         house_trained = CASE WHEN w.house_trained = 'unknown' THEN l.house_trained ELSE w.house_trained END,
         spayed_neutered = CASE WHEN w.spayed_neutered = 'unknown' THEN l.spayed_neutered ELSE w.spayed_neutered END,
         compat_kids = CASE WHEN w.compat_kids = 'unknown' THEN l.compat_kids ELSE w.compat_kids END,
         compat_dogs = CASE WHEN w.compat_dogs = 'unknown' THEN l.compat_dogs ELSE w.compat_dogs END,
         compat_cats = CASE WHEN w.compat_cats = 'unknown' THEN l.compat_cats ELSE w.compat_cats END,
         sex = CASE WHEN w.sex = 'unknown' THEN l.sex ELSE w.sex END,
         size = CASE WHEN w.size = 'unknown' THEN l.size ELSE w.size END,
         age_group = CASE WHEN w.age_group = 'unknown' THEN l.age_group ELSE w.age_group END,
         coat_length = CASE WHEN w.coat_length = 'unknown' THEN l.coat_length ELSE w.coat_length END,
         energy_level = CASE WHEN w.energy_level = 'unknown' THEN l.energy_level ELSE w.energy_level END,
         raw_breed_text = CASE WHEN w.raw_breed_text = '' THEN l.raw_breed_text ELSE w.raw_breed_text END,
         traits = (SELECT array_agg(DISTINCT t) FROM unnest(w.traits || l.traits) AS t),
         updated_at = now()
       FROM pets l WHERE w.id = $1 AND l.id = $2`,
      [winner, loser],
    );

    await client.query(
      `INSERT INTO merge_events (winner_pet_id, loser_pet_id, method, score, breakdown, moved_listings)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        winner,
        loser,
        method,
        pair?.score ?? null,
        pair ? JSON.stringify(pair.breakdown) : null,
        moved.rows.map((r) => r.source_listing_id),
      ],
    );

    await client.query(
      `UPDATE match_candidates SET status = 'superseded', decided_at = now(), decided_by = 'system'
       WHERE (pet_a = $1 OR pet_b = $1) AND status = 'pending'`,
      [loser],
    );
    await client.query("DELETE FROM pets WHERE id = $1", [loser]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await dedupePhotos(pool, winner);
  await reconcileStatus(pool, winner);
}

/** After a merge: drop near-identical photos (Hamming <= 4), keep first seen. */
async function dedupePhotos(pool: Pool, petId: string): Promise<void> {
  const { rows } = await pool.query<{ id: string; phash: string }>(
    `SELECT id, phash FROM pet_photos
     WHERE pet_id = $1 AND phash <> '' ORDER BY is_primary DESC, sort_order ASC`,
    [petId],
  );
  const kept: string[] = [];
  const drop: string[] = [];
  for (const row of rows) {
    if (kept.some((h) => hammingDistance(h, row.phash) <= 4)) drop.push(row.id);
    else kept.push(row.phash);
  }
  if (drop.length) {
    await pool.query("DELETE FROM pet_photos WHERE id = ANY($1)", [drop]);
  }
}
