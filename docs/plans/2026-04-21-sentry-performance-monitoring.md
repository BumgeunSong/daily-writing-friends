# Sentry Performance Monitoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the board detail page's performance visible in Sentry — know WHERE time is spent (query vs render vs network) and WHEN it gets worse.

**Architecture:** Replace the generic `browserTracingIntegration()` with `reactRouterV6BrowserTracingIntegration()` for parameterized route names, raise sample rate to 1.0, and add custom `Sentry.startSpan()` calls to the board detail loaders so each Supabase call appears as a distinct span in the Sentry Performance waterfall.

**Tech Stack:** @sentry/react v8, react-router-dom v6, Supabase, React Query v4

---

### Task 1: Raise tracesSampleRate to 1.0

**Files:**
- Modify: `apps/web/src/sentry.ts:7`

**Step 1: Change sample rate**

In `sentry.ts`, change the `TRACE_SAMPLE_RATE` constant:

```typescript
// Before
TRACE_SAMPLE_RATE: 0.1,

// After
TRACE_SAMPLE_RATE: 1.0,
```

**Step 2: Verify build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/src/sentry.ts
git commit -m "perf: raise Sentry tracesSampleRate to 1.0 for full visibility"
```

---

### Task 2: Add React Router v6 Sentry integration

This replaces `browserTracingIntegration()` with `reactRouterV6BrowserTracingIntegration()` and wraps `createBrowserRouter` with `Sentry.wrapCreateBrowserRouterV6()`. This gives parameterized route names like `/board/:boardId` instead of `/board/abc123` in the Sentry Performance dashboard.

**Files:**
- Modify: `apps/web/src/sentry.ts`
- Modify: `apps/web/src/router.tsx`

**Step 1: Update sentry.ts to use reactRouterV6BrowserTracingIntegration**

Replace `browserTracingIntegration()` in the integrations array:

```typescript
// sentry.ts — add these imports at the top
import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

// In the integrations array inside Sentry.init(), replace:
//   Sentry.browserTracingIntegration(),
// with:
Sentry.reactRouterV6BrowserTracingIntegration({
  useEffect,
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
}),
```

**Step 2: Export wrapCreateBrowserRouter from sentry.ts**

Add at the bottom of `sentry.ts`:

```typescript
/**
 * Wrapped createBrowserRouter for Sentry route-parameterized transaction names.
 * Use this instead of createBrowserRouter from react-router-dom.
 */
export const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(
  // Lazy import to avoid circular dependency — router.tsx imports from sentry.ts
  // so we accept createBrowserRouter as a parameter instead
);
```

Actually, to avoid circular imports (router.tsx already imports from sentry.ts indirectly), export the wrapper function directly:

```typescript
import { createBrowserRouter } from 'react-router-dom';

export const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(createBrowserRouter);
```

**Step 3: Update router.tsx to use the wrapped router**

In `router.tsx`, replace:

```typescript
// Before
import { createBrowserRouter, redirect, ScrollRestoration } from 'react-router-dom';
// ...
export const router = createBrowserRouter([

// After
import { redirect, ScrollRestoration } from 'react-router-dom';
import { sentryCreateBrowserRouter } from './sentry';
// ...
export const router = sentryCreateBrowserRouter([
```

**Step 4: Verify build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 5: Verify dev server starts**

Run: `cd apps/web && npx vite --port 5199 &` then check `http://localhost:5199` loads.
Kill the dev server after verifying.

**Step 6: Commit**

```bash
git add apps/web/src/sentry.ts apps/web/src/router.tsx
git commit -m "perf: integrate Sentry with React Router v6 for parameterized route names"
```

---

### Task 3: Add custom spans to board loaders

Wrap each async operation in `boardLoader` and `boardPostsLoader` with `Sentry.startSpan()` so the Sentry Performance waterfall shows exactly how long each Supabase call takes.

**Files:**
- Modify: `apps/web/src/board/hooks/useBoardLoader.ts`
- Modify: `apps/web/src/board/hooks/useBoardPostsLoader.ts`

**Step 1: Instrument boardLoader**

In `useBoardLoader.ts`, wrap the key operations:

```typescript
import * as Sentry from '@sentry/react';

export async function boardLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;

  if (!boardId) {
    throw new Response('Missing board ID', { status: 400 });
  }

  return Sentry.startSpan(
    { name: 'boardLoader', op: 'route.loader', attributes: { boardId } },
    async () => {
      try {
        const user = await Sentry.startSpan(
          { name: 'getCurrentUser', op: 'auth' },
          () => getCurrentUser(),
        );

        if (!user) {
          return { boardId };
        }

        const userData = await Sentry.startSpan(
          { name: 'fetchUser', op: 'db.query', attributes: { userId: user.uid } },
          () => fetchUser(user.uid),
        );

        // ... rest of permission checks remain unchanged ...
```

Keep the existing error handling and permission logic. Only wrap the two async calls: `getCurrentUser()` and `fetchUser(user.uid)`.

**Step 2: Instrument boardPostsLoader**

In `useBoardPostsLoader.ts`, wrap the key operations:

```typescript
import * as Sentry from '@sentry/react';

export async function boardPostsLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;

  if (!boardId) {
    throw new Response('Missing boardId parameter', { status: 400 });
  }

  return Sentry.startSpan(
    { name: 'boardPostsLoader', op: 'route.loader', attributes: { boardId } },
    async () => {
      const currentUser = await Sentry.startSpan(
        { name: 'getCurrentUser', op: 'auth' },
        () => getCurrentUser(),
      );

      if (!currentUser) {
        throw new Response('로그인 후 이용해주세요.', { status: 401 });
      }

      try {
        const blockedByUsers = await Sentry.startSpan(
          { name: 'getBlockedByUsers', op: 'db.query' },
          () => getBlockedByUsers(currentUser.uid),
        );

        const initialPosts = await Sentry.startSpan(
          { name: 'fetchRecentPosts', op: 'db.query', attributes: { boardId, limit: 7 } },
          () => fetchRecentPosts(boardId, 7, blockedByUsers),
        );

        return { boardId, initialPosts, blockedByUsers };
      } catch (error) {
        console.error('Failed to fetch board posts:', error);
        throw new Response('Failed to load posts', { status: 500 });
      }
    },
  );
}
```

**Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 4: Run existing tests**

Run: `cd apps/web && npx vitest run --reporter=verbose 2>&1 | tail -20`
Expected: All tests pass (these loaders may not have unit tests, but we verify no regressions)

**Step 5: Commit**

```bash
git add apps/web/src/board/hooks/useBoardLoader.ts apps/web/src/board/hooks/useBoardPostsLoader.ts
git commit -m "perf: add Sentry spans to board loaders for query-level visibility"
```

---

### Task 4: Add Supabase domain to tracePropagationTargets

Currently only `localhost` and `daily-writing-friends.com/api` are in `tracePropagationTargets`. Supabase API calls don't get the `sentry-trace` header, so distributed tracing doesn't work.

**Files:**
- Modify: `apps/web/src/sentry.ts:105-108`

**Step 1: Add Supabase domain pattern**

```typescript
// Before
tracePropagationTargets: [
  'localhost',
  /^https:\/\/daily-writing-friends\.com\/api/,
],

// After
tracePropagationTargets: [
  'localhost',
  /^https:\/\/daily-writing-friends\.com\/api/,
  /^https:\/\/.*\.supabase\.co/,
],
```

**Step 2: Verify build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/src/sentry.ts
git commit -m "perf: add Supabase domain to Sentry tracePropagationTargets"
```

---

## Out of Scope (for follow-up issues)

These were identified during analysis but are NOT part of this monitoring setup:

1. **Duplicate `getBlockedByUsers` call** — `boardPostsLoader` fetches blocked users, but `useRecentPosts` hook re-fetches them via a `useEffect`. This causes `fetchRecentPosts` to fire twice on cold load. This is a **performance bug**, not a monitoring gap. File a separate issue.

2. **Sequential queries in `fetchUser`** — `fetchUserFromSupabase` makes 2-3 sequential Supabase calls (user → permissions → optional buddy). These could be parallelized with `Promise.all`. Separate optimization issue.

3. **Supabase server-side monitoring** — `pg_stat_statements` and Supabase dashboard slow query monitoring. DBA-level work, not app code.

4. **Alerting** — Set thresholds after 1-2 weeks of baseline data at 100% sample rate. Sentry's built-in Web Vitals alerts (LCP > 2.5s) are one-click once data exists.

5. **Stats page / post list monitoring** — Start with board detail (actual pain point), expand custom spans to other pages once the pattern is validated.
