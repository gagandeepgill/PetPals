import { hammingDistance } from "../ingestion/photos";

/**
 * Pure pair-scoring. Weights per the architecture spec:
 * photos 0.35, name 0.20, description 0.15, breed 0.10, age 0.10, sex 0.10.
 * Sex mismatch is a hard veto. Signals missing on either side (no photos, no
 * description) are excluded and the remaining weights renormalized — absence
 * of data must not tank a pair.
 */

export interface DedupRecord {
  petId: string;
  species: string;
  name: string;
  sex: string; // 'male' | 'female' | 'unknown'
  ageGroup: string;
  rawBreedText: string;
  description: string | null;
  phashes: string[]; // non-empty hex hashes only
}

export interface PairScore {
  score: number;
  vetoed: boolean;
  breakdown: Record<string, number | null>;
}

/** Strip parentheticals, "ADOPTED!"-style prefixes, punctuation noise. */
export function cleanName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(adopted|pending|courtesy|urgent|bonded)\b[:!]?/gi, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatch = new Array<boolean>(a.length).fill(false);
  const bMatch = new Array<boolean>(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(b.length - 1, i + window);
    for (let j = start; j <= end; j++) {
      if (!bMatch[j] && a[i] === b[j]) {
        aMatch[i] = bMatch[j] = true;
        matches++;
        break;
      }
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function trigrams(text: string): Set<string> {
  const padded = `  ${text.toLowerCase().replace(/\s+/g, " ").trim()} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/** pg_trgm-style similarity: shared / union. */
export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const gram of ta) if (tb.has(gram)) shared++;
  return shared / (ta.size + tb.size - shared);
}

function nameScore(a: string, b: string): number {
  const jw = jaroWinkler(cleanName(a), cleanName(b));
  // Below 0.7 names carry no evidence; scale 0.7..1.0 onto 0..1.
  return jw < 0.7 ? 0 : (jw - 0.7) / 0.3;
}

function phashScore(a: string[], b: string[]): number | null {
  if (a.length === 0 || b.length === 0) return null; // signal unavailable
  let best = Number.POSITIVE_INFINITY;
  for (const ha of a) {
    for (const hb of b) {
      best = Math.min(best, hammingDistance(ha, hb));
    }
  }
  if (best <= 4) return 1; // same upload
  if (best <= 8) return 0.85; // same pet, different shot/encode
  if (best <= 12) return 0.3;
  return 0;
}

function breedScore(a: string, b: string): number {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (!na || !nb) return 0.5; // unknown breed is weak evidence either way
  if (na === nb) return 1;
  return trigramSimilarity(na, nb) >= 0.55 ? 0.7 : 0;
}

const AGE_ORDER = ["baby", "young", "adult", "senior"];

/** v1 proxy: normalizer v1 doesn't populate DOB ranges yet, so score group
 *  proximity; swap for DOB-range Jaccard when age estimates land. */
function ageScore(a: string, b: string): number {
  if (a === "unknown" || b === "unknown") return 0.5;
  if (a === b) return 1;
  const ia = AGE_ORDER.indexOf(a);
  const ib = AGE_ORDER.indexOf(b);
  return Math.abs(ia - ib) === 1 ? 0.4 : 0;
}

function descriptionScore(a: string | null, b: string | null): number | null {
  if (!a || !b || a.length < 40 || b.length < 40) return null; // too thin to signal
  const sim = trigramSimilarity(a, b);
  // Shelters copy-paste bios verbatim; >=0.7 is near-certain same pet.
  if (sim >= 0.7) return 1;
  return sim >= 0.4 ? sim : 0;
}

const WEIGHTS = { phash: 0.35, name: 0.2, description: 0.15, breed: 0.1, age: 0.1, sex: 0.1 };

export function scorePair(a: DedupRecord, b: DedupRecord): PairScore {
  if (a.species !== b.species) {
    return { score: 0, vetoed: true, breakdown: { species: 0 } };
  }
  if (a.sex !== "unknown" && b.sex !== "unknown" && a.sex !== b.sex) {
    return { score: 0, vetoed: true, breakdown: { sex: 0 } };
  }

  const signals: Record<string, number | null> = {
    phash: phashScore(a.phashes, b.phashes),
    name: nameScore(a.name, b.name),
    description: descriptionScore(a.description, b.description),
    breed: breedScore(a.rawBreedText, b.rawBreedText),
    age: ageScore(a.ageGroup, b.ageGroup),
    sex: a.sex === "unknown" || b.sex === "unknown" ? 0.5 : 1,
  };

  let weighted = 0;
  let totalWeight = 0;
  for (const [key, value] of Object.entries(signals)) {
    if (value === null) continue;
    const weight = WEIGHTS[key as keyof typeof WEIGHTS];
    weighted += value * weight;
    totalWeight += weight;
  }

  let score = totalWeight > 0 ? weighted / totalWeight : 0;
  // Policy: no auto-merge on text alone. Without photo evidence the ceiling is
  // the top of the review band — a human confirms.
  if (signals.phash === null) {
    score = Math.min(score, AUTO_MERGE_THRESHOLD - 0.01);
  }

  return { score, vetoed: false, breakdown: signals };
}

export const AUTO_MERGE_THRESHOLD = 0.85;
export const REVIEW_THRESHOLD = 0.6;
