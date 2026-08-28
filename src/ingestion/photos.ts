import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import phashBinary from "sharp-phash";

/**
 * Ingestion photo pipeline: fetch once, derive everything.
 * - phash: 64-bit DCT perceptual hash (hex) — dedup's strongest signal
 * - blurDataURL: ~20px base64 placeholder for next/image blur-up
 * - re-hosting: ONLY for licensed feed sources (partner/API); scraped sources
 *   keep their original URL (thumbnail-only display policy lives in the UI)
 */

const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

/** Sources whose terms license display/caching of media we ingest. */
const LICENSED_SOURCES = new Set(["rescuegroups", "asm3", "shelterluv", "petango"]);

export function isLicensedSource(sourceId: string): boolean {
  return LICENSED_SOURCES.has(sourceId.split(":")[0] ?? sourceId);
}

export interface ProcessedPhoto {
  /** Our URL when re-hosted, else the original. */
  url: string;
  originalUrl: string;
  phash: string;
  blurDataURL: string;
  width: number | null;
  height: number | null;
  /** Store key when re-hosted (needed for takedown). */
  storedKey: string | null;
}

export interface PhotoStore {
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * Dev store: writes under public/photos so Next serves the copies statically.
 * Swap for an S3/R2 implementation at deploy time — same two methods.
 */
export class LocalPhotoStore implements PhotoStore {
  constructor(private readonly root = join(process.cwd(), "public", "photos")) {}

  async put(key: string, data: Buffer): Promise<string> {
    await mkdir(this.root, { recursive: true });
    await writeFile(join(this.root, key), data);
    return `/photos/${key}`;
  }

  async delete(key: string): Promise<void> {
    await unlink(join(this.root, key)).catch(() => undefined);
  }
}

function binaryToHex(binary: string): string {
  let hex = "";
  for (let i = 0; i < binary.length; i += 4) {
    hex += parseInt(binary.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

async function fetchImage(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PetPalsBot/1.0 (+https://petpals.app/bot)" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.byteLength === 0 || data.byteLength > MAX_BYTES) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function processPhoto(
  originalUrl: string,
  opts: { rehost: boolean; store: PhotoStore },
): Promise<ProcessedPhoto | null> {
  const data = await fetchImage(originalUrl);
  if (!data) return null;

  try {
    const image = sharp(data, { failOn: "error" });
    const meta = await image.metadata();

    const [binary, blur] = await Promise.all([
      phashBinary(data),
      image
        .clone()
        .resize(20, undefined, { fit: "inside" })
        .jpeg({ quality: 50 })
        .toBuffer(),
    ]);

    let url = originalUrl;
    let storedKey: string | null = null;
    if (opts.rehost) {
      // Normalize the stored copy: capped at 1600px, re-encoded JPEG.
      const normalized = await sharp(data)
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      storedKey = `${createHash("sha1").update(originalUrl).digest("hex")}.jpg`;
      url = await opts.store.put(storedKey, normalized, "image/jpeg");
    }

    return {
      url,
      originalUrl,
      phash: binaryToHex(binary),
      blurDataURL: `data:image/jpeg;base64,${blur.toString("base64")}`,
      width: meta.width ?? null,
      height: meta.height ?? null,
      storedKey,
    };
  } catch {
    return null;
  }
}

export function hammingDistance(phashHexA: string, phashHexB: string): number {
  if (phashHexA.length !== phashHexB.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let i = 0; i < phashHexA.length; i++) {
    let xor = parseInt(phashHexA[i]!, 16) ^ parseInt(phashHexB[i]!, 16);
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}
