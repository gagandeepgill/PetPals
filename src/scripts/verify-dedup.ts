import {
  AUTO_MERGE_THRESHOLD,
  REVIEW_THRESHOLD,
  cleanName,
  jaroWinkler,
  scorePair,
  trigramSimilarity,
  type DedupRecord,
} from "../dedup/score";

/**
 * Labeled-pair check for the pure scorer (no DB): npx tsx src/scripts/verify-dedup.ts
 * Exits non-zero if any expectation fails.
 */

function rec(overrides: Partial<DedupRecord>): DedupRecord {
  return {
    petId: "x",
    species: "dog",
    name: "Buddy",
    sex: "male",
    ageGroup: "young",
    rawBreedText: "Labrador Retriever mix",
    description:
      "Buddy is a bouncy two-year-old who loves fetch, long walks, and everyone he has ever met. He knows sit and shake.",
    phashes: ["28b483e33e6ede63"],
    ...overrides,
  };
}

let failures = 0;
function expect(label: string, condition: boolean, detail: string) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}  (${detail})`);
  if (!condition) failures++;
}

// Same pet on two sources: near-identical photo (hamming 1), decorated name,
// copy-pasted bio.
const dupe = scorePair(
  rec({}),
  rec({
    name: "Buddy (bonded w/ Max)",
    phashes: ["28b483e33e6ede62"],
    description:
      "Buddy is a bouncy two-year-old who loves fetch, long walks, and everyone he has ever met. He knows sit and shake. Apply today!",
  }),
);
expect("same pet, two sources -> auto-merge", dupe.score >= AUTO_MERGE_THRESHOLD, `score=${dupe.score.toFixed(3)}`);

// Littermates: same org/breed/age, different names, unrelated photos, similar-ish bios.
const littermates = scorePair(
  rec({}),
  rec({
    name: "Bella",
    phashes: ["ffb483e30e0ede00"],
    description:
      "Bella is a sweet two-year-old lab mix looking for an active family. She loves toys and knows sit.",
  }),
);
expect(
  "littermates -> never auto-merge",
  littermates.score < AUTO_MERGE_THRESHOLD,
  `score=${littermates.score.toFixed(3)}`,
);

// Sex mismatch is a hard veto even with identical photos.
const veto = scorePair(rec({}), rec({ sex: "female", phashes: ["28b483e33e6ede63"] }));
expect("sex mismatch -> veto", veto.vetoed && veto.score === 0, `vetoed=${veto.vetoed}`);

// Species mismatch vetoes.
const species = scorePair(rec({}), rec({ species: "cat" }));
expect("species mismatch -> veto", species.vetoed, `vetoed=${species.vetoed}`);

// No photos on one side: copy-paste bio + name should reach the review band,
// not auto-merge (photo evidence absent).
const noPhotos = scorePair(
  rec({ phashes: [] }),
  rec({
    phashes: [],
    name: "Buddy!",
    description:
      "Buddy is a bouncy two-year-old who loves fetch, long walks, and everyone he has ever met. He knows sit and shake.",
  }),
);
expect(
  "photo-less duplicate -> review band, never auto",
  noPhotos.score >= REVIEW_THRESHOLD && noPhotos.score < AUTO_MERGE_THRESHOLD,
  `score=${noPhotos.score.toFixed(3)}`,
);

// Unrelated pets in the same city: safely below review.
const unrelated = scorePair(
  rec({}),
  rec({
    name: "Zeus",
    ageGroup: "senior",
    rawBreedText: "Great Dane",
    phashes: ["00ff00ff00ff00ff"],
    description: "Zeus is a gentle giant senior Dane who prefers quiet homes and short strolls.",
  }),
);
expect("unrelated pets -> below review", unrelated.score < REVIEW_THRESHOLD, `score=${unrelated.score.toFixed(3)}`);

// Primitive sanity.
expect("jaroWinkler exact", jaroWinkler("buddy", "buddy") === 1, "1.0");
expect("cleanName strips noise", cleanName("ADOPTED! Buddy (bonded w/ Max)") === "buddy bonded w max" || cleanName("ADOPTED! Buddy (bonded w/ Max)") === "buddy", cleanName("ADOPTED! Buddy (bonded w/ Max)"));
expect(
  "trigram sim orders sensibly",
  trigramSimilarity("labrador retriever", "labrador retriever mix") >
    trigramSimilarity("labrador retriever", "great dane"),
  "monotone",
);

if (failures > 0) {
  console.error(`${failures} expectation(s) failed`);
  process.exit(1);
}
console.log("all expectations passed");
