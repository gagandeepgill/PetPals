import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { adapterById, ADAPTERS } from "../ingestion/adapters";
import { syncSource } from "../ingestion/sync";
import { getPool } from "../lib/db";
import { checkAlerts, sweepRescueGroupsCeiling } from "./maintenance";

/**
 * The always-on worker: `npm run worker`. Requires REDIS_URL and DATABASE_URL.
 * - ingest queue: one repeatable job per source at its adapter interval,
 *   attempts 5 with exponential backoff; exhausted jobs mirror into
 *   ingest_dlq (redrive with `npm run redrive -- <dlq id>`).
 * - maintenance queue: alert checks hourly, RescueGroups 7-day-ceiling sweep
 *   every 6 hours.
 */

const INGEST_QUEUE = "ingest";
const MAINTENANCE_QUEUE = "maintenance";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required to run the worker`);
    process.exit(1);
  }
  return value;
}

async function main() {
  requireEnv("DATABASE_URL");
  const connection = new IORedis(requireEnv("REDIS_URL"), {
    // BullMQ workers require this: blocking commands must not time out.
    maxRetriesPerRequest: null,
  });

  const ingestQueue = new Queue(INGEST_QUEUE, { connection });
  const maintenanceQueue = new Queue(MAINTENANCE_QUEUE, { connection });

  const defaultJobOptions = {
    attempts: 5,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  } as const;

  for (const adapter of ADAPTERS) {
    await ingestQueue.upsertJobScheduler(
      `sync:${adapter.sourceId}`,
      { every: adapter.schedule.intervalMs },
      { name: "sync", data: { sourceId: adapter.sourceId }, opts: defaultJobOptions },
    );
  }
  // Reconcile: a scheduler whose adapter left the registry would otherwise
  // fire unknown-source jobs into retries and the DLQ forever.
  const known = new Set(ADAPTERS.map((a) => `sync:${a.sourceId}`));
  for (const scheduler of await ingestQueue.getJobSchedulers()) {
    if (scheduler.key && scheduler.key.startsWith("sync:") && !known.has(scheduler.key)) {
      await ingestQueue.removeJobScheduler(scheduler.key);
      console.warn(`[worker] removed stale scheduler ${scheduler.key}`);
    }
  }
  await maintenanceQueue.upsertJobScheduler(
    "alerts",
    { every: 3_600_000 },
    { name: "check-alerts", opts: { attempts: 1 } },
  );
  await maintenanceQueue.upsertJobScheduler(
    "rg-ceiling",
    { every: 6 * 3_600_000 },
    { name: "rg-ceiling", opts: { attempts: 1 } },
  );

  const mirrorToDlq = async (job: Job | undefined, err: Error) => {
    if (!job) return;
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) return; // retries remain
    await getPool()
      .query(
        `INSERT INTO ingest_dlq (queue, job_name, job_data, error, attempts)
         VALUES ($1, $2, $3, $4, $5)`,
        [job.queueName, job.name, JSON.stringify(job.data ?? {}), String(err), job.attemptsMade],
      )
      .catch((dlqErr) => console.error("[worker] DLQ write failed:", dlqErr));
    console.error(`[worker] ${job.queueName}/${job.name} exhausted retries -> DLQ:`, err.message);
  };

  const ingestWorker = new Worker(
    INGEST_QUEUE,
    async (job) => {
      const adapter = adapterById((job.data as { sourceId: string }).sourceId);
      if (!adapter) throw new Error(`unknown source ${JSON.stringify(job.data)}`);
      return syncSource(adapter);
    },
    { connection, concurrency: 2 },
  );
  ingestWorker.on("failed", (job, err) => void mirrorToDlq(job, err));

  const maintenanceWorker = new Worker(
    MAINTENANCE_QUEUE,
    async (job) => {
      if (job.name === "check-alerts") return checkAlerts();
      if (job.name === "rg-ceiling") return sweepRescueGroupsCeiling();
      throw new Error(`unknown maintenance job ${job.name}`);
    },
    { connection, concurrency: 1 },
  );
  maintenanceWorker.on("failed", (job, err) =>
    console.error(`[worker] maintenance/${job?.name} failed:`, err.message),
  );

  const shutdown = async () => {
    console.log("[worker] shutting down…");
    await Promise.allSettled([ingestWorker.close(), maintenanceWorker.close()]);
    await Promise.allSettled([ingestQueue.close(), maintenanceQueue.close()]);
    connection.disconnect();
    await getPool().end();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  console.log(
    `[worker] up — sources: ${ADAPTERS.map((a) => `${a.sourceId}@${a.schedule.intervalMs / 3_600_000}h`).join(", ")}; alerts hourly; rg-ceiling 6h`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
