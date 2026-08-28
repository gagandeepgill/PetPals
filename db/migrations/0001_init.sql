-- M0 schema. Layer ownership: ingestion writes ONLY source_listings;
-- normalization/entity-resolution own pets + pet_source_links; the app reads pets.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS organizations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  email            text,
  phone            text,
  website          text,
  city             text,
  state            text,
  postal_code      text,
  country          text NOT NULL DEFAULT 'US',
  location         geography(Point, 4326),
  verified_501c3   boolean NOT NULL DEFAULT false,
  partner_tier     text NOT NULL DEFAULT 'none' CHECK (partner_tier IN ('none','claimed','partner')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_source_refs (
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source           text NOT NULL,
  external_org_id  text NOT NULL,
  PRIMARY KEY (source, external_org_id)
);

CREATE TABLE IF NOT EXISTS breeds (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species  text NOT NULL,
  name     text NOT NULL,
  aliases  text[] NOT NULL DEFAULT '{}',
  UNIQUE (species, name)
);

-- Immutable provenance. raw_payload is never mutated; every normalization rule
-- is replayable against it (normalizer_version stamps the snapshot).
CREATE TABLE IF NOT EXISTS source_listings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source                  text NOT NULL CHECK (source IN ('rescuegroups','asm3','shelterluv','petango','scrape','petfinder')),
  source_site_id          text,
  external_id             text NOT NULL,
  external_org_id         text,
  org_internal_animal_id  text,
  url                     text,
  raw_payload             jsonb NOT NULL,
  normalized_snapshot     jsonb,
  normalizer_version      int NOT NULL DEFAULT 0,
  status                  text NOT NULL DEFAULT 'unknown',
  content_hash            text NOT NULL,
  first_seen_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  removed_at              timestamptz,
  UNIQUE (source, source_site_id, external_id)
);
CREATE INDEX IF NOT EXISTS source_listings_org_animal_ix
  ON source_listings (external_org_id, org_internal_animal_id);
CREATE INDEX IF NOT EXISTS source_listings_last_seen_ix ON source_listings (last_seen_at);

-- Canonical projection.
CREATE TABLE IF NOT EXISTS pets (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species                   text NOT NULL,
  name                      text NOT NULL,
  primary_breed_id          uuid REFERENCES breeds(id),
  secondary_breed_id        uuid REFERENCES breeds(id),
  is_mixed                  boolean NOT NULL DEFAULT false,
  raw_breed_text            text NOT NULL DEFAULT '',
  sex                       text NOT NULL DEFAULT 'unknown',
  size                      text NOT NULL DEFAULT 'unknown',
  age_group                 text NOT NULL DEFAULT 'unknown',
  dob_range                 daterange,
  age_confidence            text NOT NULL DEFAULT 'unknown',
  coat_length               text NOT NULL DEFAULT 'unknown',
  colors                    text[] NOT NULL DEFAULT '{}',
  energy_level              text NOT NULL DEFAULT 'unknown',
  house_trained             text NOT NULL DEFAULT 'unknown',
  spayed_neutered           text NOT NULL DEFAULT 'unknown',
  special_needs             text NOT NULL DEFAULT 'unknown',
  special_needs_description text,
  compat_kids               text NOT NULL DEFAULT 'unknown',
  compat_dogs               text NOT NULL DEFAULT 'unknown',
  compat_cats               text NOT NULL DEFAULT 'unknown',
  traits                    text[] NOT NULL DEFAULT '{}',
  description               text,
  status                    text NOT NULL DEFAULT 'unknown',
  status_computed_at        timestamptz,
  organization_id           uuid NOT NULL REFERENCES organizations(id),
  source_label              text NOT NULL DEFAULT '',
  source_url                text,
  postal_code               text,
  city                      text,
  state                     text,
  location                  geography(Point, 4326),
  adoption_fee_cents        int,
  adoption_fee_currency     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pets_location_gix ON pets USING GIST (location);
CREATE INDEX IF NOT EXISTS pets_search_ix ON pets (species, status, updated_at DESC)
  WHERE status = 'available';
CREATE INDEX IF NOT EXISTS pets_name_trgm ON pets USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pets_org_species_ix ON pets (organization_id, species);

CREATE TABLE IF NOT EXISTS pet_photos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id             uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  source_listing_id  uuid NOT NULL REFERENCES source_listings(id),
  url                text NOT NULL,
  original_url       text NOT NULL,
  width              int,
  height             int,
  phash              text NOT NULL DEFAULT '',
  blur_data_url      text,
  is_primary         boolean NOT NULL DEFAULT false,
  sort_order         int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS pet_photos_pet_ix ON pet_photos (pet_id, sort_order);

-- The merge decision = audit trail = un-merge unit. M0 uses exact-key links
-- only; scored fuzzy matching arrives in M1.
CREATE TABLE IF NOT EXISTS pet_source_links (
  pet_id             uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  source_listing_id  uuid NOT NULL REFERENCES source_listings(id) UNIQUE,
  match_method       text NOT NULL CHECK (match_method IN ('exact_external_id','exact_org_animal_id','scored','manual')),
  match_score        numeric,
  match_breakdown    jsonb,
  decided_by         text NOT NULL DEFAULT 'system',
  decided_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_id, source_listing_id)
);

-- Source tag -> canonical attribute. Rows are data, not code: adding a synonym
-- is an INSERT + replay.
CREATE TABLE IF NOT EXISTS attribute_mappings (
  id               bigserial PRIMARY KEY,
  source           text NOT NULL,
  attribute        text NOT NULL,
  raw_value        text NOT NULL,
  canonical_field  text NOT NULL,
  canonical_value  text NOT NULL,
  notes            text,
  UNIQUE (source, attribute, raw_value)
);

-- Census ZCTA centroids (load separately) — serves the ZIP entry flow with no
-- external geocoder.
CREATE TABLE IF NOT EXISTS zip_centroids (
  zip       text PRIMARY KEY,
  location  geography(Point, 4326) NOT NULL
);
