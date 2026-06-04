# Profile/Thumbnail Image Loading Optimization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Each task is a separate commit. Verify before moving on.

**Goal:** Apply the top-5 highest-impact items from the profile/thumbnail image loading audit to reduce initial loading time and eliminate refetch storms — without regressions to existing UX.

**Architecture:** Five independent changes against `apps/web/src/`. None require schema migrations. Changes #1, #3, #4 reduce bytes/RTTs; #2 cuts refetch waste; #5 fixes top-of-fold lazy-loading. Each is independently revertable.

**Tech Stack:** React 18 + TanStack Query v4 + Firebase Storage (with Resize Images extension) + Supabase Postgres + TypeScript + Vite.

**Related issue:** [#621 — BoardPage thumbnail 404 console noise](https://github.com/BumgeunSong/daily-writing-friends/issues/621). Task 1 introduces the same 404→fallback pattern for avatars. The existing `getResizedUrl` already handles this safely (try/catch + null-cache), but expect transient console noise for pre-extension avatars until backfill runs.

---

## Pre-flight (one-time)

- Current branch is `profile/thumbnail-image-loading-optimization` (worktree). All work commits here.
- `pnpm typecheck` and `pnpm test` must pass after each task.
- `pnpm dev` smoke test (board feed + open a post + notifications page) before committing each task.

---

## Task 1: Route avatars through `getResizedUrl` (128×128 variant)

**Why:** Avatars upload at 256×256 but render at 24–80px. The Firebase Resize Images extension's `128x128` variant is already configured (`THUMB_SIZES.AVATAR`) and `getAvatarUrl` helper already exists — they're just not wired to `ComposedAvatar`.

**Impact:** ~4× fewer decoded pixels per avatar (256² → 128²). Halved decoded RAM. ~5–10 KB → ~2–3 KB on the wire per first-time fetch.

**Files:**
- Create: `apps/web/src/shared/hooks/useAvatarUrl.ts`
- Modify: `apps/web/src/shared/ui/ComposedAvatar.tsx`
- Modify: `apps/web/src/shared/utils/thumbnailUrl.ts` (comment update at line 4-7)

**Step 1.1 — Create `useAvatarUrl` hook**

Mirror `useThumbnailUrl` but pin to `THUMB_SIZES.AVATAR`. Skip the lookup for Google avatar URLs (they're not Firebase Storage; they use `=s{size}` param instead). Return the input URL synchronously, then upgrade after async resolution.

```ts
// apps/web/src/shared/hooks/useAvatarUrl.ts
import { useState, useEffect } from 'react';
import { getResizedUrl, isFirebaseStorageUrl, THUMB_SIZES } from '@/shared/utils/thumbnailUrl';

export function useAvatarUrl(originalUrl: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(originalUrl ?? null);

  useEffect(() => {
    if (!originalUrl) {
      setUrl(null);
      return;
    }
    setUrl(originalUrl);
    if (!isFirebaseStorageUrl(originalUrl)) return;

    let cancelled = false;
    getResizedUrl(originalUrl, THUMB_SIZES.AVATAR).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => { cancelled = true; };
  }, [originalUrl]);

  return url;
}
```

**Step 1.2 — Wire `ComposedAvatar` through the hook**

In `ComposedAvatar.tsx`:
- Import `useAvatarUrl`.
- Replace the `renderSrc` derivation: first run `src` through `useAvatarUrl`, then apply the Google `=s{size}` param to the result.

```ts
const resolvedSrc = useAvatarUrl(src);
const renderSrc = resolvedSrc
  ? (isGoogleAvatarUrl(resolvedSrc) ? appendGoogleAvatarSizeParam(resolvedSrc, size) : resolvedSrc)
  : '';
```

**Step 1.3 — Update the stale comment in `thumbnailUrl.ts`**

Lines 4-7 currently say "Avatar rendering no longer uses this helper" — that becomes false after this task. Replace with a one-liner pointing at `useAvatarUrl`.

**Step 1.4 — Verify**

- `pnpm typecheck`
- `pnpm test`
- `pnpm dev` → load board feed, open a post detail, open notifications. Avatars still render. Expect transient `_128x128.jpg` 404s in console for older uploads (issue #621 dynamic — pre-existing for post thumbnails). Confirm fallback works (no broken images).
- DevTools Network tab: filter by `_128x128.jpg`. First-time loads should be ~2–4 KB; subsequent renders served from disk cache.

**Step 1.5 — Commit**

```
perf(avatars): route ComposedAvatar through 128x128 resized variant

Wire avatars through getResizedUrl(THUMB_SIZES.AVATAR) via a new
useAvatarUrl hook. Avatars now decode at 128x128 instead of 256x256
(~4x fewer decoded pixels per render), with graceful fallback to the
original URL when the resized variant is missing (same pattern as
useThumbnailUrl, see issue #621).

Google OAuth avatar URLs bypass the lookup since they use the =s
size parameter instead.
```

---

## Task 2: Tune `useUser` staleTime and refetch defaults

**Why:** `useUser` has `staleTime: 0` and `refetchOnWindowFocus: true`. With 12 consumer sites (`CommentHeader`, `NotificationItem`, `UserProfile`, etc.) and N comments/notifications per screen, every tab focus triggers an O(N) refetch wave. Other users' profile data changes rarely.

**Impact:** Eliminates a quiet refetch storm. No user-visible UX change for the common case (cache stays warm 5 min); editing your own profile still reflects immediately because `useEditAccount.ts` invalidates the cache directly on mutation.

**Files:**
- Modify: `apps/web/src/user/hooks/useUser.ts:25-28`

**Step 2.1 — Verify own-profile mutation invalidates the cache**

Read `apps/web/src/user/hooks/useEditAccount.ts`. Confirm it calls `queryClient.invalidateQueries(['user', uid])` (or `setQueryData`) on success. If yes, staleTime can safely move. If not, we need to add invalidation as part of this task before bumping staleTime.

**Step 2.2 — Apply the staleTime / refetch changes**

```ts
// useUser.ts:25-28
staleTime: 5 * 60 * 1000,        // 5 min: other users' profile data changes rarely
cacheTime: 30 * 60 * 1000,       // 30 min: keep in memory longer to absorb tab switches
refetchOnMount: false,            // staleTime governs; don't refetch on every mount
refetchOnWindowFocus: false,      // refetch storm on tab focus is wasted work
```

**Step 2.3 — Verify**

- `pnpm typecheck`
- `pnpm test` (especially anything under `user/__tests__/`)
- `pnpm dev`:
  - Open Network tab. Visit /board → notifications → /board again. Confirm no `users` query refires on tab switch.
  - Edit your own avatar via EditAccountPage. Confirm new avatar appears immediately in PostCard / CommentHeader (means invalidation works).

**Step 2.4 — Commit**

```
perf(user): raise useUser staleTime to 5min and disable refetch-on-focus

Other users' profile data changes rarely; refetching on every mount
and every window focus was N refetches per screen of comments or
notifications. Cuts background traffic without affecting the
own-profile-edit path, which invalidates the cache explicitly.
```

---

## Task 3: Eliminate N+1 in CommentHeader by joining author profile

**Why:** Every `CommentHeader` calls `useUser(userId)`. 20 comments visible = 20 parallel `useUser` hooks, each potentially firing an HTTP request on cold cache.

**Impact:** 1 RTT instead of N (cold cache). Even on warm cache (post-Task-2), drops 20 query subscriptions per comment list.

**Files:**
- Modify: comment fetch API (likely `apps/web/src/comment/api/comment.ts` — exact path TBD during execution)
- Modify: `apps/web/src/comment/model/Comment.ts` — add `authorProfileImageURL?: string` (and `authorName` if not already present)
- Modify: `apps/web/src/comment/components/CommentHeader.tsx:15` — remove `useUser`, take URL + name from props

**Step 3.1 — Locate and read the comment fetch query**

```bash
rg -n "from\\('?comments'?\\)|fetchComments|useComments" apps/web/src/comment --type ts --type tsx
```

Identify the query (it's likely a Supabase `select` similar to the posts query in `post/api/post.ts:91`).

**Step 3.2 — Extend the Supabase select with the author join**

Mirror the posts pattern: `users!author_id(profile_photo_url, nickname)` (column name TBD by inspection — adjust to match the comments FK name).

**Step 3.3 — Map joined row to Comment model**

Add a `mapRowToComment` helper (or extend the existing one) that flattens `users.profile_photo_url` → `comment.authorProfileImageURL`.

**Step 3.4 — Update CommentHeader to consume the field**

```ts
// CommentHeader.tsx
// Before: const { userData: userProfile } = useUser(userId);
// After: take authorName + authorProfileImageURL from props (sourced from the comment row).
```

If `CommentHeader` is used in places that don't pass a full comment row (e.g. CommentForm preview), keep `useUser` as a fallback or pass the current-user's profile in directly.

**Step 3.5 — Verify**

- `pnpm typecheck`
- `pnpm test` (comment-related tests)
- `pnpm dev`: open a post with comments. DevTools Network: confirm one comments fetch instead of N+1. Avatars + names still render correctly. Test posting a new comment — the optimistic / refetched comment should still have author info.

**Step 3.6 — Commit**

```
perf(comments): denormalize author profile into comments fetch (no N+1)

Replace per-row useUser in CommentHeader with author fields embedded
in the comments query via PostgREST nested select. Eliminates one
query per comment (was N parallel useUser hooks per visible page).
Mirrors the existing pattern in post/api/post.ts:91 for feed authors.
```

---

## Task 4: Bulk-prime user cache for notifications instead of per-row `useUser`

**Why:** After commit `ff1a21ca`, each `NotificationItem` runs its own `useUser(fromUserId)` post-LCP. With 10 notifications and cold cache, that's up to 10 parallel requests right after first paint.

**Impact:** 1 IN-query instead of up to N. Keeps the LCP path clean (notifications query still has no profile JOIN — fires after notifications have rendered). `NotificationItem` doesn't need to change; it just gets warm cache.

**Files:**
- Modify: `apps/web/src/notification/hooks/useNotifications.ts` (or whichever hook orchestrates the page) — add a follow-up bulk prefetch
- Use existing `fetchBatchUsersBasic` (already used by `useBatchPostCardData`)

**Step 4.1 — Locate the notifications page composition**

```bash
rg -n "useNotifications|NotificationItem" apps/web/src/notification --type ts --type tsx
```

Find the parent component / hook that has the full notifications array. That's where we prime the cache.

**Step 4.2 — Implement bulk prime**

After notifications resolve, derive `uniqueFromUserIds`, fire one `fetchBatchUsersBasic` call, then `queryClient.setQueryData(['user', id], userMap.get(id))` for each. `NotificationItem`'s `useUser` calls then hit the prefilled cache (staleTime from Task 2 will keep it warm).

Implementation sketch:

```ts
// In the parent (after notifications data loads):
const queryClient = useQueryClient();
useEffect(() => {
  if (!notifications?.length) return;
  const ids = [...new Set(notifications.map(n => n.fromUserId).filter(Boolean))];
  const missing = ids.filter(id => !queryClient.getQueryData(['user', id]));
  if (!missing.length) return;
  fetchBatchUsersBasic(missing).then((users) => {
    users.forEach(u => queryClient.setQueryData(['user', u.uid], u));
  });
}, [notifications, queryClient]);
```

**Step 4.3 — Verify**

- `pnpm typecheck`
- `pnpm test`
- `pnpm dev`: open notifications page on cold cache (hard reload). DevTools Network: expect one `users?id=in.(...)` request shortly after the notifications query, replacing the N parallel per-row requests. Avatars populate at roughly the same time as before.
- Cross-check with [[feedback_perf_research_first]] mindset: this should be a measurable LCP-neutral, post-LCP-traffic-reducing change. Capture before/after timing in DevTools.

**Step 4.4 — Commit**

```
perf(notifications): bulk-prime user cache instead of per-row useUser

After notifications load (post-LCP), fire one fetchBatchUsersBasic
to prime ['user', id] entries for all senders. Replaces up to N
parallel per-row useUser requests with a single IN-query. Keeps
the LCP path unchanged — the bulk prime runs after notifications
render, not before.
```

---

## Task 5: `eager` + `fetchpriority` for above-the-fold avatars

**Why:** `ComposedAvatar` defaults `loading="lazy"`, including for first-viewport avatars. Lazy-loading the first viewport delays paint past LCP.

**Impact:** Modest but free. Most LCP elements aren't avatars in this app (feed thumbnail or post hero), but lazy-loading an avatar that the browser was about to paint adds an IntersectionObserver round-trip.

**Files:**
- Modify: `apps/web/src/shared/ui/ComposedAvatar.tsx` — add optional `priority` prop
- Modify: 1–2 consumer sites where the avatar is reliably above-the-fold (e.g., `UserProfile.tsx` for the profile page header, the *first* `PostCard` in `BoardPage` if easy to express)

**Step 5.1 — Add `priority` prop to `ComposedAvatar`**

```ts
interface ComposedAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  // ...existing
  priority?: boolean; // top-of-fold; eager + fetchpriority=high
}

// In the component:
loading={priority ? 'eager' : loading}
fetchpriority={priority ? 'high' : undefined}
```

Note: `fetchpriority` is camelCase in JSX (`fetchPriority`) in React 18+. Confirm by reading the existing PostCardThumbnail or running a typecheck.

**Step 5.2 — Apply `priority` to ProfilePage header**

`UserProfile.tsx:58` renders the 80×80 profile avatar — that's always above-the-fold on the profile page. Pass `priority`.

**Step 5.3 — Skip the feed for now**

Don't try to mark "first N feed avatars" as priority — virtual scrolling and SSR-skeleton make this fragile, and the avatar isn't the LCP element on the feed (the thumbnail is). Document this decision in the commit message so it's not revisited.

**Step 5.4 — Verify**

- `pnpm typecheck`
- `pnpm test`
- `pnpm dev`: open a profile page. DevTools Network: avatar request fires immediately (not deferred by IntersectionObserver). DevTools Performance recording: avatar paint shifts earlier in the timeline.

**Step 5.5 — Commit**

```
perf(avatar): add priority prop for above-the-fold avatars

ComposedAvatar now accepts a priority boolean that sets
loading="eager" and fetchpriority="high". Applied to the profile
page header avatar, which is always above-the-fold. Feed avatars
intentionally stay lazy — the LCP element is the post thumbnail,
not the avatar, and virtual scrolling makes a "first N eager"
heuristic fragile.
```

---

## Post-implementation

- Open a PR. Title: `perf(profile-thumbnails): apply top-5 image loading optimizations`.
- Body: link to this plan + audit summary + before/after notes on what to expect in DevTools Network for the reviewer to verify.
- Optionally trigger the Web Vitals harness loop to confirm no regression on the headline metric.

## What we explicitly skipped (and why)

- **AVIF / `<picture>`** — Overkill for sub-100px avatars per audit research.
- **`srcset` with `w` descriptors** — Avatars render at fixed CSS size; browser can pick wrong density.
- **BlurHash / LQIP** — Imperceptible at 36–48px; initials fallback already exists.
- **Service worker for avatars** — HTTP cache + `cacheControl: 30d` already covers ~95%.
- **`?v={updated_at}` cache busting** — Firebase tokens already bust cache on avatar replacement (accidental but functional).
- **Backfilling the `128x128` Firebase Resize variants for old avatars** — Operational task, outside this code change. Track via issue #621 follow-up.
