import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getPool } from "../lib/db";

/** Re-enqueue a dead-lettered job: `npm run redrive -- <dlq row id>`. */
async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: npm run redrive -- <ingest_dlq id>");
    process.exit(1);
  }

  const pool = getPool();
  const { rows } = await pool.query<{
    queue: string;
    job_name: string;
    job_data: unknown;
    redriven_at: Date | null;
  }>("SELECT queue, job_name, job_data, redriven_at FROM ingest_dlq WHERE id = $1", [id]);
  const row = rows[0];
  if (!row) {
    console.error(`no DLQ row ${id}`);
    process.exit(1);
  }
  if (row.redriven_at) {
    console.error(`DLQ row ${id} was already redriven at ${row.redriven_at.toISOString()}`);
    process.exit(1);
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error("REDIS_URL is required");
    process.exit(1);
  }
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(row.queue, { connection });
  await queue.add(row.job_name, row.job_data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 30_000 },
  });
  await pool.query("UPDATE ingest_dlq SET redriven_at = now() WHERE id = $1", [id]);
  console.log(`redriven ${row.queue}/${row.job_name} from DLQ row ${id}`);

  await queue.close();
  connection.disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
