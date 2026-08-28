import { getPool } from "../db";
import type { Pet, PetPhoto, TriState } from "../domain/pet";
import {
  decodeCursor,
  encodeCursor,
  parseBbox,
  type PetCardData,
  type SearchFilter,
  type SearchResponse,
} from "../domain/search";
import { ageLabel, photoAlt, type SearchProvider } from "./provider";

const METERS_PER_MILE = 1609.344;

interface CardRow {
  lat: number | null;
  lon: number | null;
  id: string;
  name: string;
  species: string;
  age_group: string;
  raw_breed_text: string;
  is_mixed: boolean;
  city: string | null;
  state: string | null;
  org_name: string;
  source_label: string;
  status: string;
  updated_at: Date;
  distance_mi: string | null;
  photo_url: string | null;
  photo_blur: string | null;
}

function rowToCard(row: CardRow): PetCardData {
  const breedLabel = row.raw_breed_text || (row.is_mixed ? "Mixed breed" : "Breed unknown");
  return {
    id: row.id,
    name: row.name,
    species: row.species as PetCardData["species"],
    ageGroup: row.age_group as PetCardData["ageGroup"],
    ageLabel: ageLabel(row.age_group),
    breedLabel,
    distanceMi: row.distance_mi === null ? null : Math.round(Number(row.distance_mi) * 10) / 10,
    city: row.city,
    state: row.state,
    orgName: row.org_name,
    sourceLabel: row.source_label,
    status: row.status as PetCardData["status"],
    listedAt: row.updated_at.toISOString(),
    photo: row.photo_url ? { url: row.photo_url, blurDataURL: row.photo_blur } : null,
    photoAlt: photoAlt(row.name, row.age_group, breedLabel),
    lat: row.lat,
    lon: row.lon,
  };
}

const CARD_SELECT = `
  p.id, p.name, p.species, p.age_group, p.raw_breed_text, p.is_mixed,
  p.city, p.state, o.name AS org_name, p.source_label, p.status, p.updated_at,
  ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lon,
  ph.url AS photo_url, ph.blur_data_url AS photo_blur`;

const CARD_JOINS = `
  JOIN organizations o ON o.id = p.organization_id
  LEFT JOIN LATERAL (
    SELECT url, blur_data_url FROM pet_photos
    WHERE pet_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
  ) ph ON true`;

class WhereBuilder {
  clauses: string[] = ["p.status = 'available'"];
  params: unknown[] = [];

  add(clause: string, ...values: unknown[]): void {
    let sql = clause;
    for (const value of values) {
      this.params.push(value);
      sql = sql.replace("?", `$${this.params.length}`);
    }
    this.clauses.push(sql);
  }

  next(value: unknown): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  get sql(): string {
    return this.clauses.join(" AND ");
  }
}

function applyFilters(w: WhereBuilder, filter: SearchFilter): void {
  if (filter.species) w.add("p.species = ?", filter.species);
  if (filter.breed) w.add("p.raw_breed_text ILIKE ?", `%${filter.breed}%`);
  if (filter.ageGroup?.length) w.add("p.age_group = ANY(?)", filter.ageGroup);
  if (filter.size?.length) w.add("p.size = ANY(?)", filter.size);
  if (filter.sex) w.add("p.sex = ?", filter.sex);
  if (filter.energy?.length) w.add("p.energy_level = ANY(?)", filter.energy);
  if (filter.coat?.length) w.add("p.coat_length = ANY(?)", filter.coat);
  if (filter.houseTrained !== undefined) {
    w.add("p.house_trained = ?", String(filter.houseTrained));
  }
  const compatValues = filter.includeUnknownCompat ? ["true", "unknown"] : ["true"];
  for (const target of filter.goodWith ?? []) {
    w.add(`p.compat_${target} = ANY(?)`, compatValues);
  }
  const box = parseBbox(filter.bbox);
  if (box) {
    w.add(
      "p.location::geometry && ST_MakeEnvelope(?, ?, ?, ?, 4326)",
      box.minLon,
      box.minLat,
      box.maxLon,
      box.maxLat,
    );
  }
}

async function zipCentroid(zip: string): Promise<string | null> {
  const { rows } = await getPool().query<{ loc: string }>(
    "SELECT location::text AS loc FROM zip_centroids WHERE zip = $1",
    [zip],
  );
  return rows[0]?.loc ?? null;
}

export const pgProvider: SearchProvider = {
  async searchPets(filter: SearchFilter): Promise<SearchResponse> {
    const pool = getPool();
    const w = new WhereBuilder();
    applyFilters(w, filter);

    let distanceExpr = "NULL";
    const centroid = filter.zip ? await zipCentroid(filter.zip) : null;
    if (centroid) {
      const c = w.next(centroid);
      distanceExpr = `ST_Distance(p.location, ${c}::geography) / ${METERS_PER_MILE}`;
      w.add(
        `ST_DWithin(p.location, ${c}::geography, ?)`,
        filter.radius * METERS_PER_MILE,
      );
    }

    const useDistance = filter.sort === "distance" && centroid !== null;
    const cursor = filter.cursor ? decodeCursor(filter.cursor) : null;
    if (cursor) {
      if (useDistance) {
        const d = w.next(Number(cursor.sortValue));
        const id = w.next(cursor.id);
        w.clauses.push(
          `((${distanceExpr}) > ${d} OR ((${distanceExpr}) = ${d} AND p.id > ${id}))`,
        );
      } else {
        const ts = w.next(cursor.sortValue);
        const id = w.next(cursor.id);
        w.clauses.push(`(p.updated_at, p.id) < (${ts}::timestamptz, ${id})`);
      }
    }

    const orderBy = useDistance
      ? `(${distanceExpr}) ASC, p.id ASC`
      : "p.updated_at DESC, p.id DESC";
    const limitParam = w.next(filter.limit + 1);

    const { rows } = await pool.query<CardRow>(
      `SELECT ${CARD_SELECT}, (${distanceExpr}) AS distance_mi
       FROM pets p ${CARD_JOINS}
       WHERE ${w.sql}
       ORDER BY ${orderBy}
       LIMIT ${limitParam}`,
      w.params,
    );

    const hasMore = rows.length > filter.limit;
    const page = hasMore ? rows.slice(0, filter.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor(
            useDistance ? String(last.distance_mi ?? 0) : last.updated_at.toISOString(),
            last.id,
          )
        : null;

    // Facets and total share the filter WITHOUT the cursor predicate.
    const fw = new WhereBuilder();
    applyFilters(fw, filter);
    if (centroid) {
      const c = fw.next(centroid);
      fw.add(`ST_DWithin(p.location, ${c}::geography, ?)`, filter.radius * METERS_PER_MILE);
    }
    const [speciesFacet, ageFacet, totalRes] = await Promise.all([
      pool.query<{ k: string; n: string }>(
        `SELECT p.species AS k, count(*) AS n FROM pets p WHERE ${fw.sql} GROUP BY 1`,
        fw.params,
      ),
      pool.query<{ k: string; n: string }>(
        `SELECT p.age_group AS k, count(*) AS n FROM pets p WHERE ${fw.sql} GROUP BY 1`,
        fw.params,
      ),
      pool.query<{ n: string }>(`SELECT count(*) AS n FROM pets p WHERE ${fw.sql}`, fw.params),
    ]);

    return {
      results: page.map(rowToCard),
      facets: {
        species: Object.fromEntries(speciesFacet.rows.map((r) => [r.k, Number(r.n)])),
        ageGroup: Object.fromEntries(ageFacet.rows.map((r) => [r.k, Number(r.n)])),
      },
      nextCursor,
      total: Number(totalRes.rows[0]?.n ?? 0),
    };
  },

  async getPetById(id: string): Promise<Pet | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT p.*, o.name AS org_name,
              ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lon
       FROM pets p JOIN organizations o ON o.id = p.organization_id
       WHERE p.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;

    const { rows: photoRows } = await pool.query(
      `SELECT id, source_listing_id, url, original_url, width, height, phash,
              blur_data_url, is_primary, sort_order
       FROM pet_photos WHERE pet_id = $1 ORDER BY is_primary DESC, sort_order ASC`,
      [id],
    );
    const { rows: linkRows } = await pool.query(
      "SELECT source_listing_id FROM pet_source_links WHERE pet_id = $1",
      [id],
    );

    const photos: PetPhoto[] = photoRows.map((ph) => ({
      id: ph.id,
      sourceListingId: ph.source_listing_id,
      url: ph.url,
      originalUrl: ph.original_url,
      width: ph.width,
      height: ph.height,
      phash: ph.phash,
      blurDataURL: ph.blur_data_url,
      isPrimary: ph.is_primary,
      sortOrder: ph.sort_order,
    }));

    return {
      id: row.id,
      species: row.species,
      name: row.name,
      breed: {
        primaryBreedId: row.primary_breed_id,
        secondaryBreedId: row.secondary_breed_id,
        isMixed: row.is_mixed,
        rawBreedText: row.raw_breed_text,
      },
      sex: row.sex,
      size: row.size,
      age: {
        group: row.age_group,
        estimatedDobStart: null,
        estimatedDobEnd: null,
        confidence: row.age_confidence,
      },
      coatLength: row.coat_length,
      colors: row.colors,
      energyLevel: row.energy_level,
      houseTrained: row.house_trained as TriState,
      spayedNeutered: row.spayed_neutered as TriState,
      specialNeeds: row.special_needs as TriState,
      specialNeedsDescription: row.special_needs_description,
      compat: {
        kids: row.compat_kids as TriState,
        dogs: row.compat_dogs as TriState,
        cats: row.compat_cats as TriState,
      },
      traits: row.traits,
      description: row.description,
      status: row.status,
      statusComputedAt: row.status_computed_at?.toISOString() ?? "",
      organizationId: row.organization_id,
      organizationName: row.org_name,
      sourceLabel: row.source_label,
      sourceUrl: row.source_url,
      location: {
        lat: row.lat ?? 0,
        lon: row.lon ?? 0,
        postalCode: row.postal_code,
        city: row.city,
        state: row.state,
      },
      photos,
      sourceListingIds: linkRows.map((l) => l.source_listing_id),
      adoptionFee:
        row.adoption_fee_cents !== null
          ? { amountCents: row.adoption_fee_cents, currency: row.adoption_fee_currency ?? "USD" }
          : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  },

  async getFeatured(limit: number): Promise<PetCardData[]> {
    const { rows } = await getPool().query<CardRow>(
      `SELECT ${CARD_SELECT}, NULL AS distance_mi
       FROM pets p ${CARD_JOINS}
       WHERE p.status = 'available'
       ORDER BY p.updated_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map(rowToCard);
  },
};
