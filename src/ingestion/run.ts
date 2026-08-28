import { getPool } from "../lib/db";
import { ADAPTERS } from "./adapters";
import { syncSource } from "./sync";

/** Manual one-shot sync of every source: `npm run ingest`.
 *  Scheduled operation lives in src/worker (BullMQ). */
async function main() {
  let failures = 0;
  for (const adapter of ADAPTERS) {
    try {
      await syncSource(adapter);
    } catch (err) {
      failures++;
      console.error(`[ingest:${adapter.sourceId}] failed:`, err);
    }
  }
  await getPool().end();
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
