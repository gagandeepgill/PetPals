import { hammingDistance, LocalPhotoStore, processPhoto } from "../ingestion/photos";

/**
 * Standalone pipeline verification (no DB needed):
 * same image at two sizes must be pHash-near; different images must be far.
 * Run: npx tsx src/scripts/verify-photos.ts
 */
async function main() {
  const store = new LocalPhotoStore();

  const [a, aResized, b] = await Promise.all([
    processPhoto("https://placedog.net/800/600?id=1", { rehost: true, store }),
    processPhoto("https://placedog.net/400/300?id=1", { rehost: false, store }),
    processPhoto("https://placedog.net/800/600?id=4", { rehost: false, store }),
  ]);

  if (!a || !aResized || !b) throw new Error(`fetch/process failed: ${[!!a, !!aResized, !!b]}`);

  console.log("photo A:", {
    url: a.url,
    phash: a.phash,
    blurBytes: a.blurDataURL.length,
    dims: `${a.width}x${a.height}`,
    storedKey: a.storedKey,
  });
  console.log("same image resized  -> hamming:", hammingDistance(a.phash, aResized.phash), "(expect <= 8)");
  console.log("different image     -> hamming:", hammingDistance(a.phash, b.phash), "(expect > 16)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
