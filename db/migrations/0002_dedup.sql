-- Dedup pipeline: review queue, tombstones, merge audit log.

-- Scored pairs in the human-review band (0.60-0.85).
CREATE TABLE IF NOT EXISTS match_candidates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_a            uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  pet_b            uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  score            numeric NOT NULL,
  breakdown        jsonb NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','merged','rejected','superseded')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  decided_at       timestamptz,
  decided_by       text,
  UNIQUE (pet_a, pet_b)
);
CREATE INDEX IF NOT EXISTS match_candidates_pending_ix
  ON match_candidates (created_at) WHERE status = 'pending';

-- A rejected pair must never be re-proposed by the matcher.
CREATE TABLE IF NOT EXISTS do_not_merge (
  pet_a       uuid NOT NULL,
  pet_b       uuid NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_a, pet_b)
);

-- Every merge, forever: the un-merge path reads this plus the immutable
-- source_listings raw payloads.
CREATE TABLE IF NOT EXISTS merge_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_pet_id   uuid NOT NULL,
  loser_pet_id    uuid NOT NULL,
  method          text NOT NULL CHECK (method IN ('exact_org_animal_id','scored_auto','manual')),
  score           numeric,
  breakdown       jsonb,
  moved_listings  uuid[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
