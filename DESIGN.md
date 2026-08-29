# Pet Pals Design Direction — "Hearth"

Synthesized 2026-08-28 from four research tracks (visual identity, component craft,
motion, home/storytelling) seeded by the ui-ux-pro-max design database. This file is
the persistent design context for anyone (human or agent) touching UI in this repo.
The token source of truth is `src/styles/theme.ts`; this file explains the *why* and
the rules the tokens can't express.

## Thesis

Warm, editorial, photo-first. The pet photos are the emotional core and the design's
job is to frame them, not compete with them. Adoption is a considered, quasi-nonprofit
decision — so the register is calm trust (The Farmer's Dog, charity: water), never
retail (Chewy) and never toy-store (claymorphism). Voice: a warm, plain-spoken friend
who volunteers at the shelter.

## Decisions log (what was rejected, and why)

| Rejected | Why |
|---|---|
| Claymorphism + vibrant orange `#F97316`/blue `#2563EB` (the design-DB's "Pet Tech" pick) | By 2026 clay is niche-locked to kids/casual apps; that hue pair is the recognizable Tailwind-default axis. Reads "toy store," not "trust me with a living being." |
| Rip-and-replace to a green biophilic system | Green is Rover's lane; full retheme cost for a lateral move. The DB's biophilic signal is imported as the spruce secondary instead. |
| Fraunces wonky cuts / italic swashes, arch-and-blob hero motifs | The cliché half of the warm-editorial "AI house style." Keep the warmth, drop the tells. |
| Search-first hero (Airbnb/Petfinder pattern) | Reads database. Our differentiator is live aggregated inventory — lead with proof of life. |
| Scrims or backdrop-blur under photo overlay chips | Scrims gray the pet's face; backdrop-filter is per-card compositing cost in long grids. Solid chips only. |
| Duotone treatment on live listings | Adopters need true coat colors. Duotone is reserved for empty states/marketing bands. |
| Whole-card hover lift | Cards are borderless (photo + text stack); nothing to lift. Hover = photo zoom + name color. |
| Animation library in v1 | Everything specs as CSS keyframes + imperative CSS variables. Sanctioned exception: Vaul (~5kb) for sheet drag physics only, if hand-rolling hurts. Motion-for-React (~34kb) fights the RSC boundary; GSAP is overkill with no timeline work in scope. |
| Guilt copy, urgency badges, fake match percentages | Ethics and register. Banned words: journey, furever, unlock, seamless, "discover your perfect companion," platform. |
| Terracotta `#E07A5F` as a TEXT color | 2.74:1 on sand — fails WCAG even for large text. Reading terracotta is `--pp-accent-text` (`#A84B35` light / `#F0A588` dark); `#E07A5F` is for filled surfaces only. Same audit: primary buttons are warm-ink-on-terracotta (cream label was 2.83:1), light focus ring is `#C96248` (300 was 1.87:1), warning text is honey-800. |
| Cream label on primary buttons | See above — Hermès-style dark-on-orange passes AA (4.84:1) and reads more premium than blown-out cream. |
| Static type scale + hand-rolled hero clamp | Replaced by a fluid Utopia scale (1.2 ratio @320px → 1.25 @1240px, rem bounds so zoom works) with a new `4xl` hero step. Tracking tokens: −0.015em hero, −0.01em display, +0.06em caps; nothing at body sizes — Fraunces/Nunito `opsz` handles those. |
| Fraunces SOFT 100 at every size | Full softness under ~20px reads as blur; small Fraunces (card names, org names, banners) runs SOFT 60 (`displayVariationSmall`). WONK stays 0 everywhere. Fraunces is also banned from data slots — stat-tile values are body-face + `tabular-nums`. |
| Warm-tinted photo edge (`rgba(45,42,38,…)`) | Tinted outlines pick up the photo underneath and read as dirt. `--pp-image-outline` is untinted black/white at 10%. |

## Palette

Light mode (current tokens stay unless listed):

- Keep: terracotta ramp (primary `#E07A5F`, hover `#C96248`, deep `#A84B35`,
  subtle `#FDF1EC`), sand grounds (`#FAF6F0` / white raised / `#F4EDE2` sunken),
  ink text (`#2D2A26` / `#57524B`), sage success, honey warning, clay danger.
- **Add — spruce trust secondary**: `--pp-trust: #3E5C50` (dark: `#8FB3A3`).
  Use for verified-shelter badges, shelter links, "adoption of record" affordances.
  Exists to break all-terracotta monotone and carry nonprofit trust coding.
- **Add — overlay surface**: `--pp-surface-overlay` (light `#FFFFFF`, dark = raised)
  for sheets/dropdowns, distinct from `surface-raised`.
- **Honey is celebration-only** (adopted banners, "found a home" stamps) — never CTAs;
  avoids commerce-urgency coding. Favorite heart = clay-warm `#E25D6A` family, not retail red.

Dark mode — **espresso, not charcoal** (warmth is the casualty to protect):

- Ground `#221B16`, surface `#2A221C`, raised `#332A22`, border `#3A3129`.
- Text warm off-white `#F2EAE0` / secondary `#B8A99A` — never pure white.
- Accent lifts lighter/more saturated: `#F0A588` range. Green celebration reads
  "system status" on dark — use amber/honey there instead.
- Photos are the light source: never dim them; seat them with a 1px warm border.

## Typography

- **Fraunces** (display): headings and pet names only, weights 600–800,
  **SOFT axis high, WONK 0**, no italic swashes. The pet's name on a card is the one
  Fraunces moment there — it's what makes it a pet, not a product.
- **Nunito Sans** (body): everything else. Base 16px, line-height 1.55.
- If differentiation ever proves insufficient, the swap is display→Bricolage Grotesque;
  body and tokens survive unchanged.

## Photo treatment (shelter/UGC photos — the aesthetic bottleneck)

1. Card thumbnails: **4:5 portrait**, `object-fit: cover; object-position: center 30%`
   (face bias). Detail hero: 3:2 / 4:3 mosaic. Raw aspect ratios never hit the grid.
2. Every photo in a **12px-radius** frame (one step under the 16px card token) with a
   1px inset border `rgba(45,42,38,0.08)`; wrapper background `surface-sunken` so
   loading shows warm sand, not white flash.
3. Constant unifying overlay: `linear-gradient(rgba(224,122,95,0.04), rgba(45,42,38,0.10))`
   top-warm→bottom-ink via pseudo-element — harmonizes mixed white balance, guarantees
   overlay-chip legibility. Optional `filter: saturate(0.96) contrast(1.02)`.
4. No-photo fallback: sand-100 tile + line-drawn species icon in terracotta-300 + the
   pet's initial. Never a gray broken-image box.
5. Blur-up loading (ingestion-computed `blurDataURL`), sand-toned skeletons.

## Component rules

- **PetCard**: borderless (no bg/border/shadow at rest) — photo + text stack.
  Name: Fraunces lg/800. Facts line: sm, `·` separators, one line, ellipsis.
  Overlay chip: top-left, solid `surface-raised` pill, max one per photo.
  Heart: top-right, 24px icon in 44×44 hit target, white 2px stroke +
  `drop-shadow(0 1px 2px rgba(0,0,0,0.45))` for any-photo contrast.
  Hover: photo `scale(1.04)` (clipped) + name→accent. Press: card `scale(0.98)`.
- **Chips**: 36px tall, pill. Active = `accent-subtle` bg + 1.5px accent border —
  **never solid-filled** (solid accent is reserved for CTAs). Multi-select count badge
  18px. Overflow: scroll-snap + token-colored edge fade.
- **Filter sheet footer**: live **"Show N pets"** primary button (debounce 250ms,
  inline spinner while pending — never a stale number). This is the single
  highest-perceived-quality detail in the app.
- **Key facts**: stat tiles (label-over-value, bordered 12px), not pills.
- **Tri-state compatibility**: Yes = check + success tint. No = neutral minus
  (a preference, not an error — never red ✕). Unknown = **dashed border** + honey
  speech-bubble + "Not yet known — ask the shelter." Missing data must not look broken.
- **CTA**: "Ask about {name}" / "Start adoption at {shelter} ↗" — always personalized,
  always honest about the handoff. Sticky bottom bar on mobile.
- **Adopted pets**: celebrate, don't 404 — banner + slight hero desaturation +
  "meet more pets like {name}" link. The page is shareable proof the product works.
- **Elevation — three levels only** ("quiet surfaces"): L0 grid cards/page = flat;
  L1 tiles/shelter card/chips = 1px border + shadow-sm; L2 sheets/dropdowns/sticky
  bars = shadow-lg + border. Dark mode: elevation = lighter surface + visible border
  (`box-shadow: 0 0 0 1px var(--pp-border)`); real shadow only on L2 overlays.
- **Illustrations**: custom 2–3 color spot illustrations (line + terracotta/sage/honey
  fills) as inline SVG on `currentColor` — 4 scenes: empty search, error, found-home,
  no-photos. One consistent set beats polish.

## Motion

Personality: ~65% warm / 35% Linear-restraint. Principles: motion only on intent or
state change; one hero moment per view (grid = heart, detail = photo transition);
**spring easing only for affirmations**, standard for anything that moves content
being read; 320ms is the ceiling.

- Grid entrance: 200ms fade+8px rise, 25ms stagger **capped at 8 cards**; never on
  filter changes.
- Filter → results: no FLIP (server-rerendered grid) — `useTransition` pending dims
  container to 0.6, crossfade back, `min-height` pinned. Continuity from the container
  never blanking.
- Favorite heart (showpiece): 350ms spring pop + ≤6-particle burst ≤16px radius,
  tap-only, favorite-direction-only, never on load. Unfavorite = plain 120ms fade.
- Card→detail: baseline 320ms content entrance; shared-element photo via
  `view-transition-name` as progressive enhancement (React `<ViewTransition>` still
  unstable — never a core-navigation dependency).
- Skeletons: no exit animation (fading skeleton + fading content = double flash);
  content fades in only if skeleton showed >300ms.
- Sheet: 320ms `cubic-bezier(0.32, 0.72, 0, 1)` (add as `easing.sheet`); drag via
  `--sheet-y`; dismiss at velocity >0.5px/ms or 35% displacement.
- Anti-jank: compositor props only; `will-change` set imperatively and removed on end;
  animate shadow via pseudo-element opacity, not `box-shadow`; entrance animations and
  `content-visibility`/virtualization never overlap.
- All of it behind `prefers-reduced-motion`; the global kill-switch backstops.

## Home page

Section order: (1) **live-data hero** — "3,412 pets near Sacramento are looking for
someone. Maybe you." + rotating collage of 4–6 real listing photos in slightly rotated
frames, tappable, name+distance chips; one CTA "See who's waiting"; no gradient wash,
no ghost second button. (2) Quick-intent species photo-cards + location affordance.
(3) "New faces this week" rail. (4) How-it-works trust strip — aggregator model as the
pitch ("One search instead of three… the adoption itself happens with the shelter"),
sources named proudly, "listings synced N minutes ago" freshness stat. (5) "Been
waiting a while" long-stay rail — compassion framing, zero guilt. (6) Shelter-partner
strip ("Every listing comes from a real shelter or rescue"). (7) Celebration close —
recently-adopted strip + "Start looking."

Hero data: cached `/api/hero-stats` (count within radius + recent faces + place name),
~15min revalidate; location ladder = saved pref → server-side IP city → national
fallback ("48,000+ pets across the country…"). Never render "0 pets near you" — widen
radius below threshold. Number renders server-side in first paint; faces hydrate after.

## Voice

Warm, plain-spoken, shelter-crediting, zero guilt. Examples: "New faces this week" ·
"Been waiting a while" · "See who's waiting" · "Nobody matches that yet — but new pets
arrive every day. Want us to keep an eye out?" · "From here, you're in Happy Tails'
hands — they're the experts on Biscuit." · Error: "That didn't work. It's us, not you —
try again in a moment."

## Implementation deltas from the current scaffold (the retheme checklist)

1. `theme.ts`/`GlobalStyles`: add `--pp-trust` (+dark), `--pp-surface-overlay`,
   `easing.sheet`; re-point dark ramp to espresso values; replace dark shadow tokens
   with border-as-shadow variants.
2. Load Fraunces with `SOFT` axis high / `WONK 0` via `next/font` axes config.
3. PetCard: 4:3 → **4:5**, borderless anatomy, photo-zoom hover (drop lift), photo
   overlay gradient + inset border, heart with drop-shadow contrast treatment.
4. Chips: active state → subtle+border (currently correct), add count badges + edge fade.
5. Detail page: stat tiles, tri-state redesign (dashed unknown), personalized CTA label.
6. Home page: rebuild per section order above (hero needs `/api/hero-stats`).
7. Empty/adopted states per component rules; commission/draw the 4 spot illustrations.
