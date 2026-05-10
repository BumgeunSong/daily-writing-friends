# supabaseReads.ts Feature-Boundary Split — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dissolve `apps/web/src/shared/api/supabaseReads.ts` (1282 LOC, 38 exports, 7 domains) by relocating each export to the feature-owned `api/` directory it belongs to, restoring the documented feature-based architecture.

**Architecture:** The codebase already enforces `apps/web/src/<feature>/api/` per AGENTS.md (board, comment, donator, notification, post, stats, user). `shared/api/` should hold only cross-feature infrastructure (`supabaseClient.ts`, `httpClient.ts`). We move functions one domain at a time, update all 22 import sites, verify with type-check + tests + dev server smoke, and commit per move. After the last move, delete `supabaseReads.ts` itself and add an ESLint rule that fails new fetch* additions to `shared/api/`.

**Tech Stack:** TypeScript, Supabase JS SDK, Vitest, React Query v4, pnpm workspace, ESLint.

**Why this is the right shape:**
- Each move is a pure relocation — no behavior change, type signatures preserved.
- Bite-sized tasks (one domain group per task) → fail-fast at type-check, recoverable per commit.
- The ESLint rule prevents regression after merge — without it, the next contributor will add `fetchFooFromSupabase` back to `shared/api/`.

---

## Pre-flight Inventory

**Current state of `apps/web/src/shared/api/supabaseReads.ts`** (verified 2026-05-10):

| Domain | Exports | Destination |
|---|---|---|
| Pure utility | `computeWeekDaysFromFirstDay` | `apps/web/src/post/utils/weekDays.ts` (new) |
| Post mapping | `mapRowToPost`, `FEED_POST_SELECT`, `fetchRecentPostsFromSupabase`, `fetchBestPostsFromSupabase` | `apps/web/src/post/api/post.ts` |
| Notification | `NotificationDTO`, `fetchNotificationsFromSupabase` | `apps/web/src/notification/api/notificationApi.ts` |
| Reaction | `fetchReactionsFromSupabase`, `fetchBatchReactionsForComments` | `apps/web/src/comment/api/reaction.ts` |
| Reply | `fetchRepliesFromSupabase`, `fetchReplyCountFromSupabase`, `fetchReplyByIdFromSupabase` | `apps/web/src/comment/api/reply.ts` |
| Comment | `fetchCommentsFromSupabase`, `fetchCommentByIdFromSupabase` | `apps/web/src/comment/api/comment.ts` |
| Board | `fetchBoardsFromSupabase`, `fetchBoardByIdFromSupabase`, `fetchBoardTitleFromSupabase` | `apps/web/src/board/api/board.ts` (new) |
| User | `fetchUserFromSupabase`, `fetchAllUsersFromSupabase`, `fetchUsersWithBoardPermissionFromSupabase`, `BasicUserRow`, `fetchBatchUsersBasic` | `apps/web/src/user/api/user.ts` |
| Posting/Activity | `SupabasePosting`, `SupabaseCommenting`, `SupabaseReplying`, `fetchPostingsFromSupabase`, `fetchPostingsByDateRangeFromSupabase`, `fetchCommentingsByDateRangeFromSupabase`, `fetchReplyingsByDateRangeFromSupabase` | `apps/web/src/user/api/{posting,commenting,replying}.ts` (`commenting.ts` exists) |
| Stats batch | `UserIdRow`, `PostDateRow`, `ActivityCounts`, `fetchBatchCommentUserIdsByDateRange`, `fetchBatchCommentCountsByDateRange`, `fetchBatchReplyUserIdsByDateRange`, `fetchBatchReplyCountsByDateRange`, `fetchBatchPostDatesByDateRange`, `fetchActivityCountsFromSupabase` | `apps/web/src/stats/api/stats.ts` |

**Importers** (22 files): board/utils, comment/api/{comment,reaction,reply}.ts, comment/hooks/{useActivity,usePrefetchCommentReactions}, notification/api/notificationApi.ts, notification/api/notificationApi.test.ts, post/api/post.ts, post/hooks/useBatchPostCardData.ts, post/hooks/__tests__/useBatchPostCardData.test.ts, post/model/Post.test.ts, post/utils/{postUtils,batchPostCardDataUtils}.ts, stats/api/stats.ts, stats/hooks/{useCurrentUserCommentingStats,useCommentingStats}.ts, user/api/{user,user.test,commenting}.ts, user/hooks/useUserPosts.ts, shared/api/supabaseReads.test.ts.

**Verification commands used throughout this plan:**
```bash
pnpm --filter web type-check
pnpm --filter web test:run
pnpm --filter web lint
```

---

## Task 0: Foundation — ESLint guard + board/api/ skeleton

**Why first:** The ESLint rule is the standards-layer artifact that prevents regression. Land it before moves so any new imports point to the right place. Creating `board/api/` skeleton avoids interleaved directory creation later.

**Files:**
- Create: `eslint-local-rules/no-new-shared-supabase-fetch.js`
- Modify: `eslint.config.js`
- Create: `apps/web/src/board/api/board.ts` (empty stub with header comment only)

**Step 1: Write the ESLint rule**

```js
// eslint-local-rules/no-new-shared-supabase-fetch.js
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Block new fetch*FromSupabase exports from shared/api/. Use feature/api/ instead.' },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('apps/web/src/shared/api/')) return {};
    if (filename.endsWith('supabaseClient.ts') || filename.endsWith('httpClient.ts')) return {};
    return {
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl) return;
        const name =
          decl.type === 'FunctionDeclaration' ? decl.id?.name :
          decl.type === 'VariableDeclaration' ? decl.declarations[0]?.id?.name :
          null;
        if (name && /^fetch.*FromSupabase$/.test(name)) {
          context.report({ node, message: `'${name}' must live in <feature>/api/, not shared/api/.` });
        }
      },
    };
  },
};
```

**Step 2: Wire the rule into `eslint.config.js`**

Locate the `apps/web` block in `eslint.config.js` (read the file first to see the existing pattern for `require-sort-compare`). Add `'local/no-new-shared-supabase-fetch': 'error'` to the `rules` object.

**Step 3: Create board/api/board.ts stub**

```ts
// apps/web/src/board/api/board.ts
// Board CRUD/read functions. Filled by Task 7.
export {};
```

**Step 4: Verify**

```bash
pnpm --filter web lint
```
Expected: existing rules pass; the new rule does not trigger because `supabaseReads.ts` does not match `fetch.*FromSupabase` for new exports we introduce — confirm by adding a temporary `export async function fetchTestFromSupabase() {}` to `supabaseReads.ts`, running lint, expecting the rule to fire, then removing it.

**Step 5: Commit**

```bash
git add eslint-local-rules/no-new-shared-supabase-fetch.js eslint.config.js apps/web/src/board/api/board.ts
git commit -m "chore: add ESLint guard against new fetch*FromSupabase in shared/api/"
```

---

## Task 1: Move pure utility — `computeWeekDaysFromFirstDay`

**Why early:** Pure function (no Supabase calls) — easy to relocate, easy to write a unit test if missing. Builds confidence in the move pattern.

**Files:**
- Read: `apps/web/src/shared/api/supabaseReads.ts:1-40` (find the function and any neighboring docs)
- Create: `apps/web/src/post/utils/weekDays.ts`
- Create: `apps/web/src/post/utils/__tests__/weekDays.test.ts` (if not already covered by `supabaseReads.test.ts`)
- Modify: every importer of `computeWeekDaysFromFirstDay`

**Step 1: Find all callers**

```bash
cd /Users/bumgeunsong/.superset/worktrees/bb8ce98c-99e3-417f-a2f0-b39ddeae47dd/pitch-navy
grep -rn "computeWeekDaysFromFirstDay" apps/web/src/ --include="*.ts" --include="*.tsx"
```

**Step 2: Move function to `apps/web/src/post/utils/weekDays.ts`**

Copy the function verbatim (preserve JSDoc, preserve signature). Export it from the new file.

**Step 3: Move/copy its test from `supabaseReads.test.ts`**

Open `apps/web/src/shared/api/supabaseReads.test.ts`, locate any `describe('computeWeekDaysFromFirstDay', ...)` block, move it to `apps/web/src/post/utils/__tests__/weekDays.test.ts`, update the import to point to the new path. If no test exists, write a minimal one:

```ts
import { describe, it, expect } from 'vitest';
import { computeWeekDaysFromFirstDay } from '../weekDays';

describe('computeWeekDaysFromFirstDay', () => {
  it('returns 0 when post is on the first day', () => {
    expect(computeWeekDaysFromFirstDay('2026-05-01', '2026-05-01T10:00:00Z')).toBe(0);
  });
  // Add 2-3 more cases mirroring the original behavior — read the function body to know what to assert.
});
```

**Step 4: Update all importers**

For each file from Step 1, change:
```ts
import { computeWeekDaysFromFirstDay } from '@/shared/api/supabaseReads';
// or '@shared/api/supabaseReads'
```
to:
```ts
import { computeWeekDaysFromFirstDay } from '@post/utils/weekDays';
```

**Step 5: Remove the function from `supabaseReads.ts`**

Delete the function and its `export` line from `supabaseReads.ts`. Leave the file otherwise intact.

**Step 6: Verify**

```bash
pnpm --filter web type-check
pnpm --filter web test:run -- weekDays.test.ts
pnpm --filter web test:run -- supabaseReads.test.ts
```
Expected: all green. If type-check fails on a stale import, fix it before commit.

**Step 7: Commit**

```bash
git add apps/web/src/post/utils/weekDays.ts apps/web/src/post/utils/__tests__/weekDays.test.ts apps/web/src/shared/api/supabaseReads.ts apps/web/src/shared/api/supabaseReads.test.ts <changed-importers>
git commit -m "refactor: move computeWeekDaysFromFirstDay to post/utils"
```

---

## Task 2: Move post mapping + feed reads → `post/api/post.ts`

**Targets:** `mapRowToPost`, `FEED_POST_SELECT`, `fetchRecentPostsFromSupabase`, `fetchBestPostsFromSupabase`, `PostRowWithEmbeds` (likely an internal type — move with `mapRowToPost`).

**Files:**
- Read: `apps/web/src/shared/api/supabaseReads.ts` (locate the four exports + any private helper types)
- Modify: `apps/web/src/post/api/post.ts` (append the moved functions)
- Modify: every importer (use `grep -rn`)
- Modify: `apps/web/src/shared/api/supabaseReads.ts` (remove the exports)
- Modify: `apps/web/src/shared/api/supabaseReads.test.ts` → split tests into `apps/web/src/post/api/__tests__/post.test.ts`

**Step 1: Find callers**
```bash
grep -rn "mapRowToPost\|FEED_POST_SELECT\|fetchRecentPostsFromSupabase\|fetchBestPostsFromSupabase" apps/web/src/ --include="*.ts" --include="*.tsx"
```

**Step 2: Move the four exports + their private helper types to `post/api/post.ts`**

Preserve JSDoc, preserve types. If `PostRowWithEmbeds` is used only by `mapRowToPost`, move it as a non-exported type. If it's reused elsewhere, export it from `post/api/post.ts`.

**Step 3: Update imports at all call sites**
```ts
// Before
import { mapRowToPost, FEED_POST_SELECT } from '@/shared/api/supabaseReads';
// After
import { mapRowToPost, FEED_POST_SELECT } from '@post/api/post';
```

**Step 4: Move tests**

Move any `describe('mapRowToPost'...)`, `describe('fetchRecentPosts'...)`, etc. blocks from `supabaseReads.test.ts` to a new `apps/web/src/post/api/__tests__/post.test.ts`. Update imports inside the moved test blocks.

**Step 5: Remove from `supabaseReads.ts`**

**Step 6: Verify**
```bash
pnpm --filter web type-check
pnpm --filter web test:run
```
Expected: all green.

**Step 7: Smoke-test the feed in dev**

```bash
pnpm --filter web dev
```
Open the running URL, navigate to a board's feed, verify recent posts and best posts render. (See `feedback_local_vs_prod.md` — use local Supabase + dev server.) Take a screenshot or note the visible post titles to confirm.

**Step 8: Commit**
```bash
git commit -m "refactor: move post feed reads to post/api/post"
```

---

## Task 3: Move notification reads → `notification/api/notificationApi.ts`

**Targets:** `NotificationDTO`, `fetchNotificationsFromSupabase`.

**Files:**
- Modify: `apps/web/src/notification/api/notificationApi.ts` (append)
- Modify: `apps/web/src/notification/api/notificationApi.test.ts` (move relevant tests in)
- Modify: `apps/web/src/shared/api/supabaseReads.ts` (remove)
- Modify: importers

**Step 1: Find callers**
```bash
grep -rn "NotificationDTO\|fetchNotificationsFromSupabase" apps/web/src/ --include="*.ts" --include="*.tsx"
```

**Step 2-7:** Same pattern as Task 2 (move → update imports → move tests → remove originals → type-check + test:run → smoke-test notifications page in dev → commit).

**Smoke test:** Open the notifications page in dev, verify list renders.

**Commit:** `refactor: move notification reads to notification/api`

---

## Task 4: Move reaction reads → `comment/api/reaction.ts`

**Targets:** `fetchReactionsFromSupabase`, `fetchBatchReactionsForComments`.

Same pattern. Smoke test: open a post detail page with comments that have reactions, verify reaction counts/icons render.

**Commit:** `refactor: move reaction reads to comment/api/reaction`

---

## Task 5: Move reply reads → `comment/api/reply.ts`

**Targets:** `fetchRepliesFromSupabase`, `fetchReplyCountFromSupabase`, `fetchReplyByIdFromSupabase`.

Same pattern. Smoke test: open a post with comments + replies, expand replies, verify counts.

**Commit:** `refactor: move reply reads to comment/api/reply`

---

## Task 6: Move comment reads → `comment/api/comment.ts`

**Targets:** `fetchCommentsFromSupabase`, `fetchCommentByIdFromSupabase`.

Same pattern. Smoke test: open a post detail, verify comment list renders; navigate to a single comment URL if such a route exists.

**Commit:** `refactor: move comment reads to comment/api/comment`

---

## Task 7: Move board reads → `board/api/board.ts`

**Targets:** `fetchBoardsFromSupabase`, `fetchBoardByIdFromSupabase`, `fetchBoardTitleFromSupabase`.

The destination file was created as a stub in Task 0. Replace its `export {};` with the actual moved content.

Same pattern. Smoke test: open the boards list, then a board detail, verify board title in header.

**Commit:** `refactor: move board reads to board/api/board`

---

## Task 8: Move user reads → `user/api/user.ts`

**Targets:** `fetchUserFromSupabase`, `fetchAllUsersFromSupabase`, `fetchUsersWithBoardPermissionFromSupabase`, `BasicUserRow`, `fetchBatchUsersBasic`.

Note: `user/api/user.ts` already exists with overlapping responsibilities — read it first to make sure we don't duplicate a function name. If a name collision exists (e.g., another `fetchUserFromSupabase`), reconcile by keeping the more complete implementation and updating call sites.

Same pattern. Smoke test: open profile pages, member lists, verify user info renders.

**Commit:** `refactor: move user reads to user/api/user`

---

## Task 9: Move posting/activity types + date-range reads → `user/api/{posting,commenting,replying}.ts`

**Targets:**
- `SupabasePosting` interface + `fetchPostingsFromSupabase` + `fetchPostingsByDateRangeFromSupabase` → `user/api/posting.ts` (new)
- `SupabaseCommenting` interface + `fetchCommentingsByDateRangeFromSupabase` → `user/api/commenting.ts` (existing — verify schema alignment first)
- `SupabaseReplying` interface + `fetchReplyingsByDateRangeFromSupabase` → `user/api/replying.ts` (new)

**Step 1: Read `user/api/commenting.ts`** to see its current shape; the existing `SupabaseCommenting` may already be defined there. If duplicated, deduplicate (keep one definition, re-export if needed).

Same pattern, then commit per file (one commit per `posting.ts`, `commenting.ts`, `replying.ts`) to keep diffs reviewable.

**Smoke test:** Open the stats/profile page that consumes activity data, verify charts render.

**Commits:**
- `refactor: extract user/api/posting from shared supabaseReads`
- `refactor: consolidate commenting reads in user/api/commenting`
- `refactor: extract user/api/replying from shared supabaseReads`

---

## Task 10: Move stats batch helpers → `stats/api/stats.ts`

**Targets:** `UserIdRow`, `PostDateRow`, `ActivityCounts`, `fetchBatchCommentUserIdsByDateRange`, `fetchBatchCommentCountsByDateRange` (alias), `fetchBatchReplyUserIdsByDateRange`, `fetchBatchReplyCountsByDateRange` (alias), `fetchBatchPostDatesByDateRange`, `fetchActivityCountsFromSupabase`.

Note: the aliases (`...CountsByDateRange = ...UserIdsByDateRange`) must move together.

Same pattern. Smoke test: open stats page in dev, verify weekly/monthly counts render.

**Commit:** `refactor: move stats batch reads to stats/api/stats`

---

## Task 11: Final cleanup — delete `supabaseReads.ts`

**Files:**
- Delete: `apps/web/src/shared/api/supabaseReads.ts`
- Delete: `apps/web/src/shared/api/supabaseReads.test.ts` (its tests should now all live alongside the moved functions)
- Modify: `eslint-local-rules/no-new-shared-supabase-fetch.js` — broaden the rule to fail on *any* new export named `fetch*` in `shared/api/`, since the original file is gone (optional hardening).

**Step 1: Verify the file is empty of exports**
```bash
grep -c "^export" apps/web/src/shared/api/supabaseReads.ts
```
Expected: `0`. If non-zero, do not delete — return to the relevant Task.

**Step 2: Verify no remaining importers**
```bash
grep -rn "from.*shared/api/supabaseReads" apps/web/src/ --include="*.ts" --include="*.tsx"
```
Expected: zero matches.

**Step 3: Delete both files**
```bash
git rm apps/web/src/shared/api/supabaseReads.ts apps/web/src/shared/api/supabaseReads.test.ts
```

**Step 4: Final verification**
```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm --filter web test:run
pnpm --filter web build
```
All four must pass.

**Step 5: Full dev smoke**

Run `pnpm --filter web dev` against local Supabase. Walk: login → board list → board detail → post detail (with comments + reactions + replies) → notifications → stats/profile page → user profile. Confirm no console errors and all data renders.

**Step 6: Commit**
```bash
git commit -m "refactor: delete shared/api/supabaseReads — fully split into feature/api/"
```

---

## Verification Summary (run before declaring complete)

```bash
# 1. Static
pnpm --filter web type-check
pnpm --filter web lint

# 2. Tests
pnpm --filter web test:run

# 3. Production build
pnpm --filter web build

# 4. Confirmation greps
grep -c "^export" apps/web/src/shared/api/supabaseReads.ts 2>/dev/null || echo "FILE DELETED ✓"
grep -rn "from.*shared/api/supabaseReads" apps/web/src/ | wc -l   # expect 0
ls apps/web/src/shared/api/                                       # expect: httpClient.ts, supabaseClient.ts, supabaseClient.test.ts only

# 5. Runtime smoke (manual): feed, post detail, comments, reactions, replies, notifications, stats, user profile
```

Use **superpowers:verification-before-completion** to confirm each command output matches expected before claiming done.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Hidden private helper used by multiple moved functions | Search for non-exported helpers (`function `, `const `) at each step; relocate to nearest sensible spot or duplicate small ones |
| Type re-export breakage (e.g., `SupabasePosting` already in `user/model/`) | Check destination before move; deduplicate, don't append |
| Test file already exists at destination | Append new `describe` blocks rather than overwrite |
| Smoke test surfaces a real bug introduced by the move | Stop, isolate, fix in same task — do not commit broken state |
| Aliases drift (`fetchBatchCommentCountsByDateRange = fetchBatchCommentUserIdsByDateRange`) | Move both together in the same commit |

---

## Execution Handoff

Plan saved to `docs/plans/2026-05-10-supabasereads-feature-split.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per Task, review its diff between Tasks, iterate fast. Best for keeping you in the loop on each move.

**2. Parallel Session (separate)** — Open a new Claude Code session in this worktree, point it at this plan with `superpowers:executing-plans`, batch through with checkpoints. Best for "run it overnight."

**Which approach?**
