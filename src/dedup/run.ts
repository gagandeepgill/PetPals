import { getPool } from "../lib/db";
import { mergePets, pickWinner } from "./merge";
import {
  AUTO_MERGE_THRESHOLD,
  REVIEW_THRESHOLD,
  scorePair,
  type DedupRecord,
} from "./score";

/**
 * Dedup runner: `npm run dedup`. Two passes:
 *   1. Deterministic — same organization + same normalized org_internal_animal_id
 *      across different sources: auto-merge, no scoring.
 *   2. Scored — blocked candidate pairs (same species AND (same org OR within
 *      25km)), cross-source only, not tombstoned; auto-merge >= 0.85, review
 *      queue 0.60-0.85.
 */

const BLOCK_RADIUS_M = 25_000;
const MAX_PAIRS_PER_RUN = 5_000;

interface CandidateRow {
  pet_a: string;
  pet_b: string;
}

async function exactPass(): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query<{ pet_a: string; pet_b: string }>(
    `SELECT DISTINCT least(la.pet_id, lb.pet_id) AS pet_a,
                     greatest(la.pet_id, lb.pet_id) AS pet_b
     FROM source_listings sa
     JOIN pet_source_links la ON la.source_listing_id = sa.id
     JOIN pets pa ON pa.id = la.pet_id
     JOIN source_listings sb
       ON sb.source <> sa.source
      AND lower(ltrim(sb.org_internal_animal_id, '0')) = lower(ltrim(sa.org_internal_animal_id, '0'))
     JOIN pet_source_links lb ON lb.source_listing_id = sb.id
     JOIN pets pb ON pb.id = lb.pet_id AND pb.organization_id = pa.organization_id
     WHERE sa.org_internal_animal_id IS NOT NULL
       AND sa.org_internal_animal_id <> ''
       AND la.pet_id <> lb.pet_id
       AND NOT EXISTS (
         SELECT 1 FROM do_not_merge d
         WHERE d.pet_a = least(la.pet_id, lb.pet_id) AND d.pet_b = greatest(la.pet_id, lb.pet_id)
       )`,
  );

  let merged = 0;
  for (const row of rows) {
    const [winner, loser] = await pickWinner(pool, row.pet_a, row.pet_b);
    await mergePets(pool, winner, loser, "exact_org_animal_id");
    merged++;
  }
  return merged;
}

async function loadRecord(petId: string): Promise<DedupRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.id, p.species, p.name, p.sex, p.age_group, p.raw_breed_text, p.description,
            coalesce(array_agg(ph.phash) FILTER (WHERE ph.phash <> ''), '{}') AS phashes
     FROM pets p LEFT JOIN pet_photos ph ON ph.pet_id = p.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [petId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    petId: row.id,
    species: row.species,
    name: row.name,
    sex: row.sex,
    ageGroup: row.age_group,
    rawBreedText: row.raw_breed_text,
    description: row.description,
    phashes: row.phashes,
  };
}

async function scoredPass(): Promise<{ merged: number; queued: number; scored: number }> {
  const pool = getPool();
  // Cross-source pairs only: same-source listings are distinct pets by
  // construction (unique external ids).
  const { rows: candidates } = await pool.query<CandidateRow>(
    `SELECT DISTINCT least(pa.id, pb.id) AS pet_a, greatest(pa.id, pb.id) AS pet_b
     FROM pets pa
     JOIN pets pb
       ON pb.id > pa.id
      AND pb.species = pa.species
      AND (pb.organization_id = pa.organization_id
           OR (pa.location IS NOT NULL AND pb.location IS NOT NULL
               AND ST_DWithin(pa.location, pb.location, $1)))
     WHERE pa.status <> 'removed' AND pb.status <> 'removed'
       AND EXISTS (
         SELECT 1 FROM pet_source_links la JOIN source_listings sa ON sa.id = la.source_listing_id
         WHERE la.pet_id = pa.id
           AND sa.source <> ALL (
             SELECT sb.source FROM pet_source_links lb
             JOIN source_listings sb ON sb.id = lb.source_listing_id
             WHERE lb.pet_id = pb.id))
       AND NOT EXISTS (
         SELECT 1 FROM do_not_merge d
         WHERE d.pet_a = least(pa.id, pb.id) AND d.pet_b = greatest(pa.id, pb.id))
       AND NOT EXISTS (
         SELECT 1 FROM match_candidates m
         WHERE m.pet_a = least(pa.id, pb.id) AND m.pet_b = greatest(pa.id, pb.id)
           AND m.status IN ('pending','rejected'))
     LIMIT $2`,
    [BLOCK_RADIUS_M, MAX_PAIRS_PER_RUN],
  );

  let merged = 0;
  let queued = 0;
  const recordCache = new Map<string, DedupRecord | null>();
  const record = async (id: string) => {
    if (!recordCache.has(id)) recordCache.set(id, await loadRecord(id));
    return recordCache.get(id) ?? null;
  };

  for (const pair of candidates) {
    const a = await record(pair.pet_a);
    const b = await record(pair.pet_b);
    if (!a || !b) continue; // one side already merged away this run
    const result = scorePair(a, b);
    if (result.vetoed || result.score < REVIEW_THRESHOLD) continue;

    if (result.score >= AUTO_MERGE_THRESHOLD) {
      const [winner, loser] = await pickWinner(pool, pair.pet_a, pair.pet_b);
      await mergePets(pool, winner, loser, "scored_auto", result);
      recordCache.delete(pair.pet_a);
      recordCache.delete(pair.pet_b);
      merged++;
    } else {
      await pool.query(
        `INSERT INTO match_candidates (pet_a, pet_b, score, breakdown)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (pet_a, pet_b) DO NOTHING`,
        [pair.pet_a, pair.pet_b, result.score, JSON.stringify(result.breakdown)],
      );
      queued++;
    }
  }
  return { merged, queued, scored: candidates.length };
}

async function main() {
  const started = Date.now();
  const exactMerged = await exactPass();
  const { merged, queued, scored } = await scoredPass();
  console.log(
    `[dedup] exact=${exactMerged} scored_pairs=${scored} auto_merged=${merged} queued_for_review=${queued} in ${Math.round((Date.now() - started) / 1000)}s`,
  );
  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
