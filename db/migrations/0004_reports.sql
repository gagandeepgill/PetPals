-- User "report adopted" loop: the ghost-listing feedback channel.
-- One report per fingerprint per pet; N distinct open reports suppress the
-- pet from search and raise an operator alert.

CREATE TABLE IF NOT EXISTS pet_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'adopted' CHECK (kind IN ('adopted')),
  fingerprint text NOT NULL,   -- salted hash of ip+ua; dedupe, never identity
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (pet_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS pet_reports_open_ix
  ON pet_reports (pet_id) WHERE resolved_at IS NULL;
