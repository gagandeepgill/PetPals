import { createHash } from "node:crypto";
import { getPool } from "../lib/db";
import { LocalPhotoStore } from "../ingestion/photos";

/**
 * DMCA/takedown path: `npm run takedown -- <original photo URL>`.
 * Deletes every pet_photos row for the URL AND the re-hosted object in one
 * operation (store keys are deterministic: sha1(originalUrl).jpg). Policy is
 * remove-first: run this on request, discuss after.
 */
async function main() {
  const originalUrl = process.argv[2];
  if (!originalUrl) {
    console.error("usage: npm run takedown -- <original photo URL>");
    process.exit(1);
  }

  const pool = getPool();
  const { rowCount } = await pool.query("DELETE FROM pet_photos WHERE original_url = $1", [
    originalUrl,
  ]);

  const store = new LocalPhotoStore();
  await store.delete(`${createHash("sha1").update(originalUrl).digest("hex")}.jpg`);

  console.log(`removed ${rowCount ?? 0} photo row(s) + stored object for ${originalUrl}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
