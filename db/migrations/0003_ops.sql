-- Operational layer: per-run metrics, quarantine, DLQ mirror, alerts.

CREATE TABLE IF NOT EXISTS ingest_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL,
  started_at   timestamptz NOT NULL,
  finished_at  timestamptz NOT NULL DEFAULT now(),
  ok           boolean NOT NULL,
  fetched      int NOT NULL DEFAULT 0,
  changed      int NOT NULL DEFAULT 0,
  removed      int NOT NULL DEFAULT 0,
  quarantined  int NOT NULL DEFAULT 0,
  error        text
);
CREATE INDEX IF NOT EXISTS ingest_runs_source_ix ON ingest_runs (source, finished_at DESC);

-- Payloads that failed schema validation, kept whole for recipe repair.
CREATE TABLE IF NOT EXISTS ingest_quarantine (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL,
  reason      text NOT NULL,
  raw_payload jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS ingest_quarantine_open_ix
  ON ingest_quarantine (source, created_at) WHERE resolved_at IS NULL;

-- Mirror of BullMQ jobs that exhausted retries; redrive re-enqueues from here.
CREATE TABLE IF NOT EXISTS ingest_dlq (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue        text NOT NULL,
  job_name     text NOT NULL,
  job_data     jsonb NOT NULL,
  error        text,
  attempts     int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  redriven_at  timestamptz
);

CREATE TABLE IF NOT EXISTS ops_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,   -- 'source_dark' | 'count_drop' | 'validation_failures' | 'rg_ceiling'
  source      text,
  detail      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS ops_alerts_open_ix ON ops_alerts (created_at) WHERE resolved_at IS NULL;
