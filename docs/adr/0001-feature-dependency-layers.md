# ADR-0001: Feature dependency layers enforced by ESLint

Date: 2026-07-03
Status: Accepted

## Context

`apps/web/src` has 10 feature directories with ~90 cross-feature import lines and
three runtime cycles (post↔user, post↔draft-board, user↔login). New code drifts
because no direction is declared or enforced.

## Decision

1. Features are assigned layers. Runtime imports may only flow from a higher layer
   to a lower layer:
   donator(1) < user(2) < stats(3) < comment, draft(4) < post(5) < board(6)
   < login, notification, preview(7).
   Same-layer features may not import each other.
2. `import type` imports are allowed in any direction (types are erased at runtime).
3. `shared/` may not import any feature at runtime.
4. Enforcement: custom rule `local/enforce-feature-boundaries` in `eslint-local-rules/`,
   severity `error` from day one, with a baseline of `file -> feature` exception pairs
   in `eslint.config.js`. The baseline only shrinks; new violations are blocked.

## Rejected alternatives

- **Public-seam barrels (index.ts per feature):** hides internals but does not break
  cycles; ~90 imports rewritten for no directional guarantee.
- **Strict shared-only (features import only shared/):** would move Post/User models
  and PostCard into shared/, turning shared/ into a second domain layer.
- **eslint-plugin-boundaries / import/no-restricted-paths:** less control over the
  type-only exemption, pair-level baseline, and messages than a local rule.

## Known debt (remaining baseline entries)

- `user/hooks/useUserPosts.ts -> post`, `user/api/searchUserPosts.ts -> post`:
  user-page post search needs `mapRowToPost`/`FEED_POST_SELECT`, which cannot move to
  shared/ because they depend on the runtime `PostVisibility` enum in post/model.
  Resolved by the data-access seam refactor (shared post-row mapper).
- `draft/components/DraftsDrawer.tsx -> board`: drawer header displays the board
  title via `useBoardTitle`; PostCreationPage (post, layer 5) cannot fetch it either
  since board is layer 6. Resolved when a shared board-reference read exists.
  (`useBoardTitle` itself is a useState/useEffect fetch that should become a React
  Query hook when touched.)
