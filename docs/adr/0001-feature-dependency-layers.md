# ADR-0001: Feature tiers enforced by ESLint

Date: 2026-07-03 (revised 2026-07-05: 7 layers → 3 tiers, before merge)
Status: Accepted

## Context

`apps/web/src` has 10 feature directories with ~90 cross-feature import lines and
runtime cycles (notably post↔user and post↔stats). New code drifts because no
direction is declared or enforced.

An initial version assigned each feature its own layer (donator(1) … preview(7)),
derived by topologically sorting the *existing* imports to minimise the migration.
That worked mechanically but encoded false precision: the numbers were a description
of current import direction, not a principle, and "donator is the most foundational
feature" is not a statement anyone would defend. This revision collapses to three
principled tiers.

## Decision

Three tiers. An import is allowed when its target tier is the same as or below the
source, with one asymmetry between the two feature tiers:

1. **shared** — infrastructure. Imports no feature.
2. **core** — the cohesive domain model: `donator`, `user`, `post`, `comment`.
   Core features may import `shared` and **each other** (a Post has a User author; a
   Comment belongs to a Post — the domain is genuinely interrelated). Core may not
   import an app feature.
3. **app** — user-facing features composed from the core: `board`, `draft`, `stats`,
   `notification`, `login`, `preview`. App features may import `shared` and `core`,
   but **not each other** — they are peers.

Cross-cutting rules:

- `import type` is allowed in any direction (types are erased at runtime).
- Enforcement: custom rule `local/enforce-feature-boundaries` in `eslint-local-rules/`,
  severity `error` from day one, with a baseline of `file -> feature` exception pairs
  in `apps/web/eslint.config.js`. The baseline only shrinks; new violations are blocked.

The rule reports three distinct smells: `shared → feature`, `core → app` (the domain
core depending on a derived feature — an inversion), and `app → app` (lateral peer
coupling).

## Why not finer or coarser

- **7 per-feature layers:** false precision. The only real order is shared ⊳ core ⊳ app,
  plus the fact that the domain entities interrelate (which tiers-with-intra-core-allowed
  captures without inventing a rank among them).
- **3 flat tiers, same-tier banned everywhere:** would re-criminalise the core entity
  graph (`user ↔ post`), inflating the baseline for edges that are legitimately part of
  a cohesive domain model.
- **Public-seam barrels / strict shared-only / eslint-plugin-boundaries:** see the
  original rejected-alternatives analysis — barrels don't break cycles, strict-shared
  turns `shared/` into a second domain layer, and the off-the-shelf plugins give less
  control over the type-only exemption and pair-level baseline.

## Known debt (baseline)

Collapsing to tiers made the baseline *larger and more honest* — the topological sort
had hidden these by calling them "downward". The 24 baseline entries fall in three
groups; each is a real thing to fix, not an arbitrary rank violation:

- **shared → feature (4):** `SentryFeedbackDialog`, `RootRedirect`, `useAuth`,
  `uploadFeedbackScreenshot` reach into features. Resolve by dependency injection or
  by moving the needed piece into `shared/`.
- **app → app (6):** mostly `login → board` and `draft → board`. `useBoardTitle`
  (a useState/useEffect fetch that should become a React Query hook) and the onboarding
  board-waiting-list write want a shared board-reference read.
- **core → app (14):** the domain core reaching up into derived features. The dominant
  cluster is **post ↔ stats** (9 files): post cards and detail import author streak/
  badge hooks (`usePostingStreak`, `usePostProfileBadges`, `WritingBadgeComponent`,
  `calculateCommentTemperature`). This is the top refactor target — split stats into a
  presentational badge surface (shared or composed at the page level) versus the
  computation that derives from post/comment data. `post → draft` (delete-draft on
  publish) is a smaller inversion in the same family.

Note the earlier `user → post` baseline entries are gone: user and post are both core,
so their mutual imports are now legal by design.
