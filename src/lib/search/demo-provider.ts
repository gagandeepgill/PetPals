import type { Pet } from "../domain/pet";
import {
  parseBbox,
  type PetCardData,
  type SearchFilter,
  type SearchResponse,
} from "../domain/search";
import { ageLabel, photoAlt, type SearchProvider } from "./provider";

/**
 * Serves an in-memory dataset when DATABASE_URL is unset, so the UI runs (and
 * `next build` succeeds) with zero infrastructure. Six hand-authored pets plus
 * deterministic generated variants — enough volume to exercise pagination,
 * virtualization, and the map. Never used once a database is configured.
 */

interface DemoTemplate {
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
  lat: number;
  lon: number;
}

interface DemoPet extends DemoTemplate {
  listedAt: string;
}

const TEMPLATES: DemoTemplate[] = [
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
    lat: 38.581,
    lon: -121.494,
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
    lat: 38.545,
    lon: -121.741,
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
    lat: 38.752,
    lon: -121.288,
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
    lat: 38.602,
    lon: -121.443,
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
    lat: 38.409,
    lon: -121.372,
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
    lat: 38.678,
    lon: -121.176,
  },
];

const EXTRA_NAMES = [
  "Willow", "Ziggy", "Hazel", "Ollie", "Poppy", "Bear", "Luna", "Milo",
  "Daisy", "Gus", "Nova", "Chester", "Maple", "Rocket", "Ivy", "Bruno",
  "Pickles", "Sage", "Waffles", "Juniper", "Moose", "Olive", "Banjo", "Fern",
  "Tater", "Cricket", "Scout", "Peaches", "Django", "Marble", "Noodle", "Sunny",
  "Copper", "Birdie", "Tofu", "Ranger", "Plum", "Dobby", "Miso", "Clover",
  "Bandit", "Pumpkin",
];

const BASE_TIME = Date.parse("2026-08-26T09:00:00.000Z");

function buildDemoPets(): DemoPet[] {
  const pets: DemoPet[] = TEMPLATES.map((t, i) => ({
    ...t,
    listedAt: new Date(BASE_TIME - i * 3_600_000).toISOString(),
  }));

  EXTRA_NAMES.forEach((name, i) => {
    const template = TEMPLATES[i % TEMPLATES.length]!;
    const photoSeed = (i % 12) + 5;
    pets.push({
      ...template,
      id: `demo-gen-${i}`,
      name,
      sex: i % 2 === 0 ? "male" : "female",
      ageGroup: (["baby", "young", "adult", "senior"] as const)[i % 4]!,
      // Deterministic jitter (~±0.1°) keeps the map interesting without RNG.
      lat: template.lat + (((i * 37) % 41) - 20) / 200,
      lon: template.lon + (((i * 53) % 41) - 20) / 200,
      photoUrl:
        template.species === "cat"
          ? `https://cataas.com/cat?width=800&height=600&t=${photoSeed}`
          : `https://placedog.net/800/600?id=${photoSeed}`,
      listedAt: new Date(BASE_TIME - (i + 6) * 3_600_000).toISOString(),
    });
  });

  return pets;
}

const ALL_PETS = buildDemoPets();

function toCard(pet: DemoPet): PetCardData {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species as PetCardData["species"],
    ageGroup: pet.ageGroup as PetCardData["ageGroup"],
    ageLabel: ageLabel(pet.ageGroup),
    breedLabel: pet.breed,
    distanceMi: null,
    city: pet.city,
    state: pet.state,
    orgName: pet.org,
    sourceLabel: "Demo data",
    status: "available",
    listedAt: pet.listedAt,
    photo: { url: pet.photoUrl, blurDataURL: null },
    photoAlt: photoAlt(pet.name, pet.ageGroup, pet.breed),
    lat: pet.lat,
    lon: pet.lon,
  };
}

function toPet(pet: DemoPet): Pet {
  return {
    id: pet.id,
    species: pet.species,
    name: pet.name,
    breed: {
      primaryBreedId: null,
      secondaryBreedId: null,
      isMixed: pet.breed.toLowerCase().includes("mix"),
      rawBreedText: pet.breed,
    },
    sex: pet.sex,
    size: pet.size,
    age: {
      group: pet.ageGroup,
      estimatedDobStart: null,
      estimatedDobEnd: null,
      confidence: "inferred_from_group",
    },
    coatLength: "unknown",
    colors: [],
    energyLevel: pet.ageGroup === "senior" ? "low" : "moderate",
    houseTrained: pet.species === "dog" ? true : "unknown",
    spayedNeutered: true,
    specialNeeds: "unknown",
    specialNeedsDescription: null,
    compat: pet.compat,
    traits: [],
    description: pet.description,
    status: "available",
    statusComputedAt: pet.listedAt,
    organizationId: `demo-org-${pet.org.toLowerCase().replace(/\W+/g, "-")}`,
    organizationName: pet.org,
    sourceLabel: "Demo data",
    sourceUrl: null,
    location: { lat: pet.lat, lon: pet.lon, postalCode: "95814", city: pet.city, state: pet.state },
    photos: [
      {
        id: `${pet.id}-photo`,
        sourceListingId: `${pet.id}-listing`,
        url: pet.photoUrl,
        originalUrl: pet.photoUrl,
        width: 800,
        height: 600,
        phash: "",
        blurDataURL: null,
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    sourceListingIds: [`${pet.id}-listing`],
    adoptionFee: null,
    createdAt: pet.listedAt,
    updatedAt: pet.listedAt,
  };
}

function matches(pet: DemoPet, filter: SearchFilter): boolean {
  if (filter.species && pet.species !== filter.species) return false;
  if (filter.ageGroup?.length && !filter.ageGroup.includes(pet.ageGroup as never)) return false;
  if (filter.sex && pet.sex !== filter.sex) return false;
  if (filter.size?.length && !filter.size.includes(pet.size as never)) return false;
  if (filter.breed && !pet.breed.toLowerCase().includes(filter.breed.toLowerCase())) return false;
  const allowed: unknown[] = filter.includeUnknownCompat ? [true, "unknown"] : [true];
  for (const target of filter.goodWith ?? []) {
    if (!allowed.includes(pet.compat[target])) return false;
  }
  const box = parseBbox(filter.bbox);
  if (box) {
    if (pet.lon < box.minLon || pet.lon > box.maxLon || pet.lat < box.minLat || pet.lat > box.maxLat) {
      return false;
    }
  }
  return true;
}

export const demoProvider: SearchProvider = {
  async searchPets(filter: SearchFilter): Promise<SearchResponse> {
    const filtered = ALL_PETS.filter((p) => matches(p, filter)).sort((a, b) =>
      b.listedAt.localeCompare(a.listedAt),
    );

    // Demo cursor: plain offset (opaque to callers, like the real one).
    const offset = filter.cursor ? Number.parseInt(filter.cursor, 10) || 0 : 0;
    const page = filtered.slice(offset, offset + filter.limit);
    const nextOffset = offset + filter.limit;

    const facet = (key: (p: DemoPet) => string) =>
      filtered.reduce<Record<string, number>>((acc, p) => {
        acc[key(p)] = (acc[key(p)] ?? 0) + 1;
        return acc;
      }, {});

    return {
      results: page.map(toCard),
      facets: { species: facet((p) => p.species), ageGroup: facet((p) => p.ageGroup) },
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
      total: filtered.length,
    };
  },

  async getPetById(id: string): Promise<Pet | null> {
    const pet = ALL_PETS.find((p) => p.id === id);
    return pet ? toPet(pet) : null;
  },

  async getFeatured(limit: number): Promise<PetCardData[]> {
    return ALL_PETS.slice(0, limit).map(toCard);
  },
};
