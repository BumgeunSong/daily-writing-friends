# Preventing Client-Side N+1 API Calls

**Date:** 2026-05-16
**Status:** Proposed
**Triggering incident:** Sentry issue 7471070471 (board `b969e11a-…`, Samsung Internet on Android 10)

## Context

A production Sentry trace showed seven separate HTTP calls to `/donator_status?user_id=in.(SINGLE_ID)` for seven distinct post authors on one board view. The endpoint already accepts a batched `in.(id1, …, id7)` query. On a 4G mobile network the seven serial round-trips added roughly 700ms of dead time before the page became interactive.

This is the canonical N+1 shape: one call fetches the list, then one call fires per item.

## Root cause

`apps/web/src/donator/hooks/useDonatorStatus.ts` exposes both a correct batch hook and a singular wrapper that delegates to it with a single-element array:

```ts
// Correct primitive — one fetch for all ids
export function useDonatorStatusBatch(userIds: string[]) {
  return useQuery({
    queryKey: ['donator-status', stableIds(userIds)],
    queryFn: () => fetchActiveDonatorIds(userIds),
  });
}

// The N+1 vector — unique queryKey per userId
export function useDonatorStatus(userId: string | undefined) {
  const ids = useMemo(() => (userId ? [userId] : []), [userId]);
  return useDonatorStatusBatch(ids);
}
```

Each row calls `useDonatorStatus(authorId)`. Each call produces a distinct `queryKey` (`['donator-status', ['authorId']]`). React Query cannot dedupe distinct keys, so every row fires its own HTTP request.

The TODO at line 8–11 of the same file already named the problem: "a feed of N unique authors still fires N parallel donator_status lookups on first load." The fix was deferred and the trap kept shipping.

## Research: how the React community prevents this

| Approach | 2025–2026 status | Verdict for our stack |
|----------|------------------|-----------------------|
| `dataloader` on the client | Niche; fragile under React 18 Concurrent rendering | Discard |
| TanStack Query `useQueries` | Parallelizes; does not batch network calls (maintainer points users to third-party `batshit`) | Wrong tool |
| tRPC `httpBatchLink` | Standard inside tRPC only; tightly coupled to its protocol | Out of scope |
| React Server Components + `React.cache()` | Dedupes identical requests; does not batch N distinct keys; our page is client-rendered | Wrong layer |
| ESLint rules | No off-the-shelf rule catches `.map(x => useHook(x.id))` | Custom only |
| Supabase `.in()` + one `useQuery` | Documented standard; our endpoint already supports it | Adopt |

The community standard is structural, not exotic: one fetcher takes `ids: string[]` and uses `.in()`. React itself ships no built-in coalescer because none is required when the data layer exposes the right shape.

## Rule

> **Expose list-context data fetchers as one batch hook taking `ids: string[]` and returning `Set<id>` or `Map<id, T>`. Do not create a singular wrapper that delegates to the batch hook with a single-element array.**

A singular wrapper passes code review because each row uses one hook in isolation. N+1 emerges only when many rows mount together. Removing the wrapper removes the trap at the source.

### Single-id contexts

A page that legitimately fetches one record (profile page, settings) calls the raw fetcher inline within a page-local hook. Shared singular hooks are forbidden because a future list view will reuse them and reopen the trap.

## Enforcement

Two structural layers; one deferred.

**Layer 1 — File-level encapsulation.** A feature's `hooks/use*.ts` exposes only the batch hook. Singular wrappers do not exist as exports.

**Layer 2 — Return type.** Batch hooks return `Set<id>` or `Map<id, T>` rather than a single value. The caller must lift the fetch to the list parent and pass `.has(id)` or `.get(id)` results down as props.

**Deferred — Custom ESLint rule.** Detecting `.map(x => useHook(x.id))` requires a custom AST rule with maintenance cost. Layers 1 and 2 are structural and remove the vector; we revisit only if N+1s recur after six months.

## Where the rule lives

The rule is encoded in the `api-layer` project skill at `.claude/skills/api-layer/SKILL.md`. The skill auto-loads when an agent modifies files in any `*/api/` directory.

`AGENTS.md` gains a fact-only Skills section that points at `.claude/skills/`. No inline rules — AGENTS.md remains an index.

## Implementation plan

Each step is its own commit.

1. **Design doc** (this file) — committed first as the durable record.
2. **api-layer skill** — append the "N+1 Prevention" section. Text in Appendix A.
3. **AGENTS.md** — insert the Skills section between Configuration Files and Related Docs. Text in Appendix B.
4. **Fix the donator_status N+1:**
   - Delete `useDonatorStatus(userId)` from `apps/web/src/donator/hooks/useDonatorStatus.ts`.
   - Identify callers (`PostUserProfile` and any row component).
   - Lift `useDonatorStatusBatch(authors.map(a => a.id))` to the nearest list parent.
   - Pass `isDonator` as a prop to each row.
5. **Audit** — run the recipe in Appendix C and produce a candidate list. Fixes ship as separate PRs.

## Appendix A — Text added to `api-layer` skill

````markdown
## N+1 Prevention: Batch-First Hook Convention

### Rule

Expose list-context data fetchers as one batch hook taking `ids: string[]` and returning `Set<id>` or `Map<id, T>`. Do not create a singular wrapper that delegates to the batch hook with a single-element array.

### Anti-pattern

```ts
// N+1 vector — unique queryKey per id, React Query cannot dedupe
export function useDonatorStatus(userId: string) {
  const { activeUserIds } = useDonatorStatusBatch([userId]);
  return activeUserIds.has(userId);
}
```

A row component calling this passes review. Mount 100 rows and you get 100 HTTP calls.

### Correct shape

```ts
// Only the batch hook is exposed.
// The list parent fetches once; rows read from props.
const { activeUserIds } = useDonatorStatusBatch(authors.map(a => a.id));
// Pass isDonator={activeUserIds.has(author.id)} to each row.
```

### Single-id contexts (profile page, etc.)

Call the raw fetcher (`fetchActiveDonatorIds([id])`) inline within a page-local hook. Do not export a shared singular hook — a future list will reuse it and reopen the trap.

### Why

A singular wrapper passes code review because each row uses one hook in isolation. N+1 emerges only when many rows mount together. Removing the wrapper removes the trap at the source.
````

## Appendix B — Text added to `AGENTS.md`

````markdown
## Skills

`.claude/skills/` contains project-specific coding conventions. Each skill auto-loads via its frontmatter trigger.

| Skill | Domain |
|-------|--------|
| `api-layer` | Data fetchers, API functions, list-fetching hooks (N+1 prevention) |
| `react-component` | `.tsx` component structure |
| `react-hook` | Custom hook patterns, exhaustive-deps |
| `firebase-functions` | Cloud Functions in `/functions` |
| `daily-writing-friends-design` | UI / Tailwind conventions |
| `testing` | TDD, output-based test patterns |
| `refactoring` | Functional Core / Imperative Shell extraction |
| `type-system` | Type safety reviews |
| `verify-runtime` | Verifying data-flow changes via dev logs |
| `code-style` | Naming and clarity rules |
````

## Appendix C — Audit recipe

Run from the repo root:

```bash
rg "Batch\(\s*ids\s*\)" apps/web/src --type ts
rg "useMemo\(\(\) => \(.*\? \[.*\] : \[\]\)" apps/web/src --type ts
```

Priority directories:

- `user/` — posting / replying / commenting per-user data
- `post/` — likes per-post
- `comment/` — reactions per-comment
- `notification/` — per-notification metadata

For each finding, apply the same recipe: delete the singular hook, lift the batch hook to the list parent, pass results down as props.

## Open questions

- Are there list views that intentionally need per-row independence (e.g., progressive disclosure where each row's data is requested only on hover)? If yes, those need a distinct pattern; document them as exceptions in the audit findings.
- React Query v4 vs v5 split between `web` and `admin` — does the same rule transfer to `admin`? Likely yes; verify when auditing.
