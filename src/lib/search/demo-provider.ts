import type { Pet } from "../domain/pet";
import { parseBbox, type PetCardData, type SearchFilter, type SearchResponse } from "../domain/search";
import { ageLabel, photoAlt, type SearchProvider } from "./provider";

/**
 * Serves a small in-memory dataset when DATABASE_URL is unset, so the UI runs
 * (and `next build` succeeds) with zero infrastructure. Never used once a
 * database is configured.
 */

interface DemoSeed {
  id: string;
  name: string;
  species: Pet["species"];
  ageGroup: Pet["age"]["group"];
  breed: string;
  sex: Pet["sex"];
  size: Pet["size"];
  city: string;
  state: string;
  org: string;
  description: string;
  compat: Pet["compat"];
  photoUrl: string;
}

const SEED_COORDS: Record<string, [number, number]> = {
  "demo-buddy": [38.581, -121.494],
  "demo-clementine": [38.545, -121.741],
  "demo-pepper": [38.752, -121.288],
  "demo-mochi": [38.602, -121.443],
  "demo-atlas": [38.409, -121.372],
  "demo-biscuit": [38.678, -121.176],
};

const SEEDS: DemoSeed[] = [
  {
    id: "demo-buddy",
    name: "Buddy",
    species: "dog",
    ageGroup: "young",
    breed: "Labrador Retriever mix",
    sex: "male",
    size: "l",
    city: "Sacramento",
    state: "CA",
    org: "Happy Tails Rescue",
    description:
      "Buddy is a bouncy two-year-old who loves fetch, long walks, and everyone he has ever met. He knows sit and shake, and he is working hard on 'stay'.",
    compat: { kids: true, dogs: true, cats: "unknown" },
    photoUrl: "https://placedog.net/800/600?id=1",
  },
  {
    id: "demo-clementine",
    name: "Clementine",
    species: "cat",
    ageGroup: "adult",
    breed: "Domestic Short Hair",
    sex: "female",
    size: "s",
    city: "Davis",
    state: "CA",
    org: "Yolo County Animal Services",
    description:
      "Clementine is a dignified lap cat who prefers a quiet home and a sunny windowsill. She will supervise your work-from-home meetings free of charge.",
    compat: { kids: true, dogs: "unknown", cats: false },
    photoUrl: "https://cataas.com/cat?width=800&height=600&t=1",
  },
  {
    id: "demo-pepper",
    name: "Pepper",
    species: "dog",
    ageGroup: "senior",
    breed: "Beagle",
    sex: "female",
    size: "m",
    city: "Roseville",
    state: "CA",
    org: "Placer SPCA",
    description:
      "Pepper is a nine-year-old beagle and a long-stay resident — six months and counting. She is house-trained, gentle, and asks only for a soft bed and a slow stroll.",
    compat: { kids: true, dogs: true, cats: true },
    photoUrl: "https://placedog.net/800/600?id=2",
  },
  {
    id: "demo-mochi",
    name: "Mochi",
    species: "rabbit",
    ageGroup: "young",
    breed: "Holland Lop",
    sex: "male",
    size: "xs",
    city: "Sacramento",
    state: "CA",
    org: "Happy Tails Rescue",
    description:
      "Mochi is a curious lop who binkies at breakfast time. Litter-trained and bonded to no one yet — he is ready to pick his person.",
    compat: { kids: "unknown", dogs: "unknown", cats: "unknown" },
    photoUrl: "https://placedog.net/800/600?id=3",
  },
  {
    id: "demo-atlas",
    name: "Atlas",
    species: "dog",
    ageGroup: "adult",
    breed: "German Shepherd / Husky mix",
    sex: "male",
    size: "xl",
    city: "Elk Grove",
    state: "CA",
    org: "NorCal Shepherd Rescue",
    description:
      "Atlas is a striking four-year-old who needs an active home and a yard with opinions about squirrels. Experienced owners preferred.",
    compat: { kids: "unknown", dogs: true, cats: false },
    photoUrl: "https://placedog.net/800/600?id=4",
  },
  {
    id: "demo-biscuit",
    name: "Biscuit",
    species: "cat",
    ageGroup: "baby",
    breed: "Domestic Medium Hair",
    sex: "female",
    size: "xs",
    city: "Folsom",
    state: "CA",
    org: "Folsom Feline Friends",
    description:
      "Biscuit is a twelve-week-old tortie with maximum zoomies and a purr twice her size. She must be adopted with a playmate or into a home with a young cat.",
    compat: { kids: true, dogs: "unknown", cats: true },
    photoUrl: "https://cataas.com/cat?width=800&height=600&t=2",
  },
];

const LISTED_AT = "2026-08-26T09:00:00.000Z";

function toCard(seed: DemoSeed): PetCardData {
  const [lat, lon] = SEED_COORDS[seed.id] ?? [null, null];
  return {
    lat,
    lon,
    id: seed.id,
    name: seed.name,
    species: seed.species as PetCardData["species"],
    ageGroup: seed.ageGroup as PetCardData["ageGroup"],
    ageLabel: ageLabel(seed.ageGroup),
    breedLabel: seed.breed,
    distanceMi: null,
    city: seed.city,
    state: seed.state,
    orgName: seed.org,
    sourceLabel: "Demo data",
    status: "available",
    listedAt: LISTED_AT,
    photo: { url: seed.photoUrl, blurDataURL: null },
    photoAlt: photoAlt(seed.name, seed.ageGroup, seed.breed),
  };
}

function toPet(seed: DemoSeed): Pet {
  return {
    id: seed.id,
    species: seed.species,
    name: seed.name,
    breed: {
      primaryBreedId: null,
      secondaryBreedId: null,
      isMixed: seed.breed.toLowerCase().includes("mix"),
      rawBreedText: seed.breed,
    },
    sex: seed.sex,
    size: seed.size,
    age: {
      group: seed.ageGroup,
      estimatedDobStart: null,
      estimatedDobEnd: null,
      confidence: "inferred_from_group",
    },
    coatLength: "unknown",
    colors: [],
    energyLevel: seed.ageGroup === "senior" ? "low" : "moderate",
    houseTrained: seed.species === "dog" ? true : "unknown",
    spayedNeutered: true,
    specialNeeds: "unknown",
    specialNeedsDescription: null,
    compat: seed.compat,
    traits: [],
    description: seed.description,
    status: "available",
    statusComputedAt: LISTED_AT,
    organizationId: `demo-org-${seed.org.toLowerCase().replace(/\W+/g, "-")}`,
    organizationName: seed.org,
    sourceLabel: "Demo data",
    sourceUrl: null,
    location: {
      lat: SEED_COORDS[seed.id]?.[0] ?? 38.58,
      lon: SEED_COORDS[seed.id]?.[1] ?? -121.49,
      postalCode: "95814",
      city: seed.city,
      state: seed.state,
    },
    photos: [
      {
        id: `${seed.id}-photo`,
        sourceListingId: `${seed.id}-listing`,
        url: seed.photoUrl,
        originalUrl: seed.photoUrl,
        width: 800,
        height: 600,
        phash: "",
        blurDataURL: null,
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    sourceListingIds: [`${seed.id}-listing`],
    adoptionFee: null,
    createdAt: LISTED_AT,
    updatedAt: LISTED_AT,
  };
}

function matches(seed: DemoSeed, filter: SearchFilter): boolean {
  if (filter.species && seed.species !== filter.species) return false;
  if (filter.ageGroup?.length && !filter.ageGroup.includes(seed.ageGroup as never)) return false;
  if (filter.sex && seed.sex !== filter.sex) return false;
  if (filter.size?.length && !filter.size.includes(seed.size as never)) return false;
  if (filter.breed && !seed.breed.toLowerCase().includes(filter.breed.toLowerCase())) return false;
  const allowed: unknown[] = filter.includeUnknownCompat ? [true, "unknown"] : [true];
  for (const target of filter.goodWith ?? []) {
    if (!allowed.includes(seed.compat[target])) return false;
  }
  const box = parseBbox(filter.bbox);
  if (box) {
    const coords = SEED_COORDS[seed.id];
    if (!coords) return false;
    const [lat, lon] = coords;
    if (lon < box.minLon || lon > box.maxLon || lat < box.minLat || lat > box.maxLat) {
      return false;
    }
  }
  return true;
}

export const demoProvider: SearchProvider = {
  async searchPets(filter: SearchFilter): Promise<SearchResponse> {
    const filtered = SEEDS.filter((s) => matches(s, filter));
    const facet = (key: (s: DemoSeed) => string) =>
      filtered.reduce<Record<string, number>>((acc, s) => {
        acc[key(s)] = (acc[key(s)] ?? 0) + 1;
        return acc;
      }, {});
    return {
      results: filtered.slice(0, filter.limit).map(toCard),
      facets: { species: facet((s) => s.species), ageGroup: facet((s) => s.ageGroup) },
      nextCursor: null,
      total: filtered.length,
    };
  },

  async getPetById(id: string): Promise<Pet | null> {
    const seed = SEEDS.find((s) => s.id === id);
    return seed ? toPet(seed) : null;
  },

  async getFeatured(limit: number): Promise<PetCardData[]> {
    return SEEDS.slice(0, limit).map(toCard);
  },
};
