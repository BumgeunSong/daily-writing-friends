# Handoff: Parse-boundary refactor (external/ zone)

Continue the "Parse, don't validate" boundary refactor. This doc lets a fresh session pick up the per-feature Phase 2 rollout from a new branch off `main`.

Full canonical convention: GitHub issue **#698** (comment "채택된 컨벤션 v4"). Sibling issues: **#694** (Supabase boundary), **#695** (read-path error handling), **#705** (visibility fail-open). This doc summarizes the actionable parts; #698 is the source of truth for anything ambiguous.

## Goal

Confine every raw runtime-value boundary (Supabase rows, URL, storage, JSON) to a per-feature `external/` zone so hooks/components/utils only ever touch **domain types**. Make boundary violations structurally impossible or loud, not a matter of discipline.

## Status (what's merged on main)

| PR | What |
|----|------|
| #705 | `parsePostVisibility` fail-open → fail-closed (PRIVATE + Sentry) |
| #710 | Supabase generated types (`shared/external/database.types.ts`) + `createClient<Database>` |
| #709 | CI drift-check for generated types (pinned CLI 2.75.0) |
| #711 | `*/api/` → `*/external/` folder rename (all features) |
| #714 | Import-boundary lint: `getSupabaseClient`/`database.types`/`createClient` restricted to `external/` |
| #716 | **donator Phase-2 pilot** (merge this before starting — the template) |

Phase 1 (structure + enforcement) is done. **Phase 2 (per-feature content) is in progress**, donator first.

## The pattern to replicate (donator template — see `donator/external/donator.api.ts`)

For each feature, in its own PR off `main`:

1. **Rename** `<feature>/external/<x>.ts` → `<x>.api.ts` (IO), split `*Parsers.ts` → `<x>.parser.ts` + `<x>.mapper.ts` when present. Keep the rename/move in a **separate commit** from content edits (blame preservation — `git mv`, then verify `rename (100%)`). Update importers' paths in the rename commit so it still compiles.
2. **Remove `as` casts.** The typed client infers `.from(...).select(...)`, so casts are unnecessary. Replace with generated-type-derived response types:
   ```ts
   type XResponse = Pick<Database['public']['Tables']['x']['Row'], 'a' | 'b'>;   // or ['Views'] for views
   ```
   Watch for **nullability the cast hid** — e.g. view columns are often `string | null` (donator's `user_id` was; filter/handle explicitly).
3. **Split pure from impure (FCIS).** `fetch<X>From<...>` / `read<X>` = imperative shell (IO). `mapTo<X>(res): X` and `parse<X>` = functional core (pure). Export the pure functions and **unit-test them** (output-based: valid, null/edge, empty). Rename `mapRowToX` → `mapToX`.
4. **parse failure 3-classification** (only where runtime validation is needed — Json columns, enum-ish text, view-nullability, untrusted URL/storage): `throw` for identity fields, `degrade-open` (fallback + Sentry) for display fields, `degrade-closed` (conservative default, e.g. visibility→PRIVATE) for auth/visibility. Scalar columns the generated types already guarantee need **no** runtime check (2-tier rule).
5. **Swallowed errors → throw** (#695): replace `catch/log/return []` in read paths with `if (error) throw`. The global QueryCache onError (Sentry) + consumers' `?? []` are the safety net.

Files inside `external/` are exempt from the import-boundary lint, so no `eslint-disable` is needed there.

## Remaining features (each = one PR off main)

| Feature | Files in `external/` | Notes |
|---|---|---|
| **board** | board.ts | Small (like donator). Swallowed errors in `fetchBoards` (#695 cat A). |
| **stats** | stats.ts | Small but has `as` casts (UserIdRow/PostDateRow) + swallowed activity-count errors (#695). |
| **comment** | comment.ts, reaction.ts, reply.ts | Medium. Read paths already mostly `if (error) throw`. |
| **notification** | notificationApi.ts, notificationParsers.ts, notificationReads.ts | Split `notificationParsers.ts` → `.parser.ts` + `.mapper.ts`. Discriminated-union narrowing lives in the parser. |
| **post** | post.ts, postParsers.ts, like.ts | Largest boundary. Split `postParsers.ts`. `parsePostVisibility` fail-closed already done (#705). `mapRowToPost` → `mapToPost`. |
| **user** | user.ts, userReads.ts, posting.ts, commenting.ts, replying.ts, searchUserPosts.ts | Largest surface. Multiple swallowed-error read paths (#695 cat A). |

Suggested order: board/stats (small, build momentum) → comment/notification (medium) → post/user (large). Also fold in the utils/-resident boundary code (`postUtils`/`boardUtils`/`reviewUtils` `fetch*`/`mapRow*`) into `external/` as you touch each feature.

Out of scope for these PRs (separate, per #698 follow-ups): FirebaseTimestamp→plain object; `PostVisibility` enum→string-literal-union.

## Non-Supabase boundaries (#698 second half, do after Supabase features)

URL (`useParams`/`useSearchParams`/`location.state`), storage (`useSessionStorage`), `JSON.parse`. Build reader utils (`useValidatedParams`, `readLocationState`, `useSessionStorage(schema)`) first, migrate the ~4 risky sites, then add lint (`no-restricted-imports` for `react-router-dom` params + `no-restricted-syntax` for `JSON.parse` outside reader modules).

## How to work (toolchain + process)

**Node/pnpm (worktree gotcha):** the harness shell resolves nvm's node 22.14 which fails engine-strict. Prefix every command:
```bash
export PATH="/Users/bumgeunsong/.local/share/mise/installs/node/22.23.1/bin:$PATH"
PNPM=/Users/bumgeunsong/.local/share/mise/installs/pnpm/9.15.4/pnpm
$PNPM install --frozen-lockfile   # fresh worktree needs this
```
`main` is checked out in the primary worktree — don't `git checkout main` here; branch off `origin/main` directly.

**Verification (run from apps/web):** `$PNPM type-check` (must be 0), `$PNPM test:run [path]`, `$PNPM lint` (baseline is **10 errors / 422 warnings** — all pre-existing; your change must add 0). Regenerate types after schema changes: `pnpm db:types` (needs local Supabase running + CLI 2.75.0).

**Commits:** small Korean commits, WHY not WHAT. Rename commit separate from content commit. **Do not put issue/PR numbers in code messages / eslint-disable reasons / comments** — they go stale; write the reason. (Issue numbers are fine in commit messages and PR descriptions.)

**PRs:** one per feature, base `main` (no stacking needed now that Phase 1 is merged). Verify before claiming done (typecheck + tests + lint output, not assertions).

**zsh gotchas that produce false test results:** `for x in $var` doesn't word-split (use a literal list or `${=var}`); eslint/pnpm write reports to **stderr** (use `2>&1` when grepping); **`path` is a reserved zsh variable** bound to `$PATH` — never use it as a loop var (corrupts PATH silently).

## Key findings carried forward

- Typed client is non-breaking *because* the existing `as` casts absorb it; casts only "bite" when removed (Phase 2) — which is why the as-ban lint came after generated types.
- View columns lose NOT NULL → generated types show `| null` the casts hid (donator `user_id`). Always check nullability when removing a cast.
- The DB already fail-closes null visibility (RLS + feed view `NULL = 'public'` is not true); client now agrees (#705).
