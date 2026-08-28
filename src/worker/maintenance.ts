import { getPool } from "../lib/db";
import { ADAPTERS } from "../ingestion/adapters";

/** Maintenance jobs run by the worker on their own schedulers. */

async function raiseAlert(kind: string, source: string | null, detail: object): Promise<void> {
  const pool = getPool();
  // One open alert per (kind, source) — re-raising an unresolved condition is noise.
  const { rowCount } = await pool.query(
    `SELECT 1 FROM ops_alerts
     WHERE kind = $1 AND source IS NOT DISTINCT FROM $2 AND resolved_at IS NULL`,
    [kind, source],
  );
  if (rowCount) return;
  await pool.query("INSERT INTO ops_alerts (kind, source, detail) VALUES ($1, $2, $3)", [
    kind,
    source,
    JSON.stringify(detail),
  ]);
  console.warn(`[alert] ${kind} source=${source ?? "-"} ${JSON.stringify(detail)}`);
}

export async function checkAlerts(): Promise<void> {
  const pool = getPool();

  for (const adapter of ADAPTERS) {
    const { rows: latest } = await pool.query<{
      finished_at: Date;
      fetched: number;
      quarantined: number;
    }>(
      `SELECT finished_at, fetched, quarantined FROM ingest_runs
       WHERE source = $1 AND ok ORDER BY finished_at DESC LIMIT 1`,
      [adapter.sourceId],
    );
    const last = latest[0];

    // Source dark: no successful run within 2x the expected interval.
    const maxAgeMs = adapter.schedule.intervalMs * 2;
    if (!last || Date.now() - last.finished_at.getTime() > maxAgeMs) {
      await raiseAlert("source_dark", adapter.sourceId, {
        lastSuccess: last?.finished_at ?? null,
        expectedIntervalMs: adapter.schedule.intervalMs,
      });
      continue;
    }

    // Count drop: latest fetched < 60% of the 7-day median.
    const { rows: medianRows } = await pool.query<{ median: string | null }>(
      `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY fetched) AS median
       FROM ingest_runs
       WHERE source = $1 AND ok AND finished_at > now() - interval '7 days'`,
      [adapter.sourceId],
    );
    const median = Number(medianRows[0]?.median ?? 0);
    if (median > 0 && last.fetched < median * 0.6) {
      await raiseAlert("count_drop", adapter.sourceId, { fetched: last.fetched, median });
    }

    // Validation failures over 10% of the latest run.
    if (last.fetched + last.quarantined > 0) {
      const rate = last.quarantined / (last.fetched + last.quarantined);
      if (rate > 0.1) {
        await raiseAlert("validation_failures", adapter.sourceId, {
          quarantined: last.quarantined,
          fetched: last.fetched,
          rate: Number(rate.toFixed(3)),
        });
      }
    }
  }
}

/**
 * RescueGroups contract: cached data must be refreshed at least weekly. Any
 * RG listing unseen for 7 days is suppressed regardless of why — display of
 * older data is a terms violation, not just staleness.
 */
export async function sweepRescueGroupsCeiling(): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query<{ pet_id: string }>(
    `UPDATE source_listings sl SET status = 'removed', removed_at = now()
     FROM pet_source_links l
     WHERE l.source_listing_id = sl.id
       AND sl.source = 'rescuegroups'
       AND sl.status <> 'removed'
       AND sl.last_seen_at < now() - interval '7 days'
     RETURNING l.pet_id`,
  );
  if (rows.length) {
    await pool.query(
      `UPDATE pets SET status = 'removed', status_computed_at = now(), updated_at = now()
       WHERE id = ANY($1)`,
      [rows.map((r) => r.pet_id)],
    );
    await raiseAlert("rg_ceiling", "rescuegroups", { suppressed: rows.length });
  }
}
