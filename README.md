# Pet Pals

A unified pet-adoption aggregator — one search across shelters and rescue networks.
Adoptions always happen at the shelter; Pet Pals is an information service, never a broker.

Architecture spec: see the Pet Pals Blueprint (decision log, data flow, legal guardrails).
Stack: Next.js App Router · TypeScript strict · Emotion · PostgreSQL 16 + PostGIS.

## Quick start

```bash
npm install
npm run dev
```

With no `DATABASE_URL` set, the app serves a small demo dataset so the UI runs with zero
infrastructure. For real data:

```bash
cp .env.example .env    # fill in DATABASE_URL, RESCUEGROUPS_API_KEY, REVALIDATE_SECRET
npm run migrate         # applies db/migrations/*.sql (needs PostGIS)
npm run ingest          # full RescueGroups sync -> source_listings -> pets
```

## Layout

| Path | What it is |
|---|---|
| `src/app` | App Router: `(browse)` group (home, `/search`, `/pets/[id]`), API route handlers |
| `src/components/ui` | Emotion design system — every file is `"use client"` |
| `src/styles` | Token theme (`var(--pp-*)` CSS variables), Emotion `Theme` typing, global styles |
| `src/lib` | Domain models, search contract (zod), `SearchProvider` (Postgres now, Typesense later) |
| `src/ingestion` | `SourceAdapter` contract, RescueGroups v5 adapter, normalizer v1, sync runner |
| `db/migrations` | Schema: immutable `source_listings` provenance -> canonical `pets` projection |

## Ground rules baked into the code

- **Ingestion writes only `source_listings`;** normalization owns `pets`. Raw payloads are
  immutable so normalization rules are replayable (`NORMALIZER_VERSION`).
- **Tri-state attributes** (`'true' | 'false' | 'unknown'`): a listing that doesn't mention
  cats says nothing about cats.
- **De-listing is as fresh as listing:** removed/adopted pets are status-upserts, never row
  deletes, and ingestion POSTs `/api/revalidate` so cached pages update in seconds.
- **RescueGroups terms:** daily refresh, no re-syndication (route handlers serve only this
  frontend), delete-on-termination via per-source lineage.
- **Emotion is client-only** (no RSC support): styled code lives behind `"use client"`
  leaves; server components compose them and pass content through as `children`.
