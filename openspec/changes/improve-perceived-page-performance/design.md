## Context

The web app at `apps/web` is a Vite + React 18 SPA on React Router v6 data-router with Supabase Postgres + Auth, React Query v4.44, Sentry browser SDK, and Firebase RemoteConfig. Sentry shows FCP p75 of 4.22s on `/` and 4.85s on `/board/*/post/*`, with TTFB in the 170–620ms range — i.e., the network is healthy and the cost is on the client. The proposal commits to *measuring before fixing* (Phase 0) and then attacking two known load-bearing wins: removing the deprecated Quill editor and code-splitting the eager-imported route table. Cache persistence and Suspense skeletons are explicitly deferred until measurement justifies them.

`router.tsx` currently statically imports ~25 page components, including `PostEditPage`, `PostCreationPage`, `StatsPage`, and the entire login/onboarding flow. `main.tsx` initializes Sentry (including Replay) synchronously. `package.json` still depends on `react-quill-new` (~250KB minified) even though `tiptap_editor_enabled` is at 100% in production Firebase Remote Config.

## Goals / Non-Goals

**Goals:**
- Reduce initial JS payload on `/` by enough to drop FCP p75 below 2.5s
- Remove `react-quill-new` and its callsites without breaking historical posts that still hold Quill HTML
- Defer non-critical-path third-party initialization (Sentry Replay) past first paint
- Establish a measurable baseline (`verify_report.md`) so a follow-up proposal can be data-driven

**Non-Goals:**
- React Query cache persistence (deferred — separate proposal)
- Suspense + skeleton refactor and loader → React Query unification (deferred)
- Removing `RemoteConfigProvider` itself (only the one flag is removed; provider stays for future flags)
- OG meta tag / social-share preview prerender (acknowledged, out of scope)
- Migration to TanStack Router or any SSR framework

## Decisions

**1. Phase 0 measurement uses `vite-bundle-visualizer` + Lighthouse, not Sentry-only metrics.**
- Why: Sentry gives field RUM but no per-chunk attribution. We need Rollup chunk sizes (visualizer) and a synthetic main-thread breakdown (Lighthouse mobile profile) to confirm whether bundle, RemoteConfig fetch, or Sentry init is the dominant FCP blocker.
- Run `pnpx vite-bundle-visualizer` (no dep added). Lighthouse via Chrome DevTools, throttled "Slow 4G + 4× CPU slowdown", median of 3 runs.
- Alternative considered: Webpack Bundle Analyzer. Rejected — we're on Rollup/Vite; visualizer is the native tool.

**2. Use React Router `lazy:` (RR ≥ 6.4) instead of `React.lazy()` + `<Suspense>` at the route boundary.**
- Why: RR's `lazy:` integrates with the data-router error/permission flow, returns a `{ Component, errorElement }` bundle in one async boundary, and avoids the Suspense reorganization that `React.lazy` would force.
- **Two patterns, one default:**
  - **Default (co-lazy, simple):** for routes whose loader is small and not on the hot path, return both Component and loader from the same `lazy:` block. The chunk fetch happens first, then the loader executes — *sequential*, not parallel. The bundle-size win is real, but there is no waterfall improvement.
    ```ts
    {
      path: 'notifications',
      lazy: async () => {
        const { default: NotificationsPage } = await import('@/notification/components/NotificationsPage');
        return { Component: NotificationsPage };
      },
    }
    ```
  - **High-traffic loaders (true parallel):** for `boardLoader` and `postDetailLoader` — the routes that show up most in Sentry — define a thin static `loader:` wrapper that imports and forwards. RR fires the static `loader:` and the `lazy:` chunk fetch in parallel at route match, eliminating the waterfall.
    ```ts
    {
      path: 'board/:boardId',
      loader: async (args) => {
        const { boardLoader } = await import('@/board/hooks/useBoardLoader');
        return boardLoader(args);
      },
      lazy: async () => {
        const { default: BoardPage } = await import('@/board/components/BoardPage');
        return { Component: BoardPage, errorElement: <PermissionErrorBoundary /> };
      },
    }
    ```
  - The "true parallel" pattern still pays the import round-trip for the loader module, but that import races with the page chunk import instead of being chained behind it. For loaders that bundle Supabase query code, this can shave hundreds of ms off LCP on warm visits.

**3. Critical-path stays eager.** Routes/components that always render on first paint and are small:
- `RootLayout`, `RootRedirect`, `BottomNavigatorLayout`, `ErrorBoundary`, `PermissionErrorBoundary`, `StatusMessage`, `LoginPage`, `PrivateRoutes`, `PublicRoutes` guards
- Rationale: dynamic-importing these adds a network round-trip to literally every cold start with no payoff (they're <5KB each, always needed).

**4. Vite `manualChunks` rewrite — explicit, not heuristic.**
- Drop the stale `firebase/firestore` entry (Firestore was removed during Supabase migration).
- Keep `react-vendor` for `react`, `react-dom`, `react-router-dom`.
- After Phase 0 confirms the heavy deps, add explicit chunks for the top 3 (likely `@sentry/react/replay`, `recharts` if surfaced by Stats, `react-markdown`).
- Lower `chunkSizeWarningLimit` from 1000 to 500 to catch regressions in CI.

**5. Sentry Replay removed entirely** *(2026-05-16 scope change: was "deferred"; switched to removal during PR2 implementation. User confirmed they only consult error reports + breadcrumbs in Sentry, not Replay sessions. Deferring would still pay the post-FCP fetch and add `requestIdleCallback` plumbing for a feature that goes unused — removal is strictly better: same bundle savings, zero complexity, easy to re-add later by reinstalling the integration in `Sentry.init`.)*

**5. (historical, superseded) Sentry Replay deferred via `requestIdleCallback` + dynamic `import()`.**
- Why: Replay is ~50–70KB gzipped and is non-critical for first paint. Errors before Replay loads still get captured by the base SDK; only session-replay frames before the deferred init are missed.
- **Important SDK v8 detail:** `Sentry.replayIntegration()` accepts sample-rate options as integration props (`sessionSampleRate`, `errorSampleRate`). Top-level `replaysSessionSampleRate` / `replaysOnErrorSampleRate` passed to `Sentry.init({...})` are consumed *at init time*. If Replay is added later via `Sentry.addIntegration()`, those top-level rates are orphaned — they will not retroactively apply, and Replay silently records nothing. **The deferred integration MUST receive the rates explicitly.**
- Changes to `apps/web/src/sentry.ts`:
  - Remove `Sentry.replayIntegration()` from the `integrations` array passed to `Sentry.init({...})`
  - Remove `replaysSessionSampleRate` and `replaysOnErrorSampleRate` from the top-level init options (orphaned without Replay at init)
  - Keep `SENTRY_CONFIG.REPLAY_SAMPLE_RATE` and `SENTRY_CONFIG.REPLAY_ON_ERROR_RATE` exported so the deferred helper can read them
- New file `apps/web/src/sentryReplay.ts`:
  ```ts
  import * as Sentry from '@sentry/react';
  import { SENTRY_CONFIG } from './sentry';

  export function enableReplay(): void {
    Sentry.addIntegration(
      Sentry.replayIntegration({
        sessionSampleRate: SENTRY_CONFIG.REPLAY_SAMPLE_RATE,
        errorSampleRate: SENTRY_CONFIG.REPLAY_ON_ERROR_RATE,
      })
    );
  }
  ```
- Pattern in `main.tsx`:
  ```ts
  initSentry();
  const loadReplay = () => import('./sentryReplay').then(m => m.enableReplay());
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadReplay, { timeout: 4000 });
  } else {
    setTimeout(loadReplay, 2000);   // Safari < 16.4 fallback
  }
  ```
- Safari support: `requestIdleCallback` shipped in Safari 16.4 (March 2023). iOS 16.4+ covers active iPhones; the `setTimeout(2000)` fallback handles the long tail. 2s is acceptable because Replay is non-critical.
- Tab-close before idle callback fires → no Replay captured for that session. Acceptable.
- Alternative considered: drop Replay entirely. Rejected — debugging value outweighs the load cost once deferred.

**6. Quill removal preserves legacy-content readers; `useImageUpload` is deleted entirely.**
- **`convertQuillBulletLists` + DOMPurify pipeline in `contentUtils.ts`:** posts created before the Tiptap rollout are stored as Quill HTML in the DB. The converter is editor-independent — it normalizes `<ol data-list="bullet">` into semantic `<ul>` for display. Tests in `contentUtils.test.ts` stay green and canonical.
- **`useImageUpload.ts` is Quill-only, not editor-agnostic.** Initial design-review claimed Tiptap benefited from the paste handler in `useImageUpload.ts:230-258`. Implementation discovery (grep across `apps/web/`) showed:
  - The only consumer of `useImageUpload` is `PostTextEditor.tsx` (Quill).
  - Tiptap uses its own hook `useTiptapImageUpload`, and `EditorTiptap.tsx` (lines 55-95) wires its own capture-phase `paste` / `drop` / `dragover` handlers against `editor.view.dom`. Tiptap never invokes the `useImageUpload` paste handler.
  - The string "Reuses existing pattern from useImageUpload" in `sanitizeHtml.ts` is a comment only; no runtime dependency.
- **Action:** delete `apps/web/src/post/hooks/useImageUpload.ts` and `apps/web/src/post/hooks/__tests__/useImageUpload.test.ts` together with `PostTextEditor.tsx`. Update the stale comment in `sanitizeHtml.ts:61-64` so it no longer points to a deleted file.

**7. `tiptap_editor_enabled` flag deletion path:**
- (a) Verify in Firebase Remote Config console that the flag is at 100% true with no remaining variations / experiments.
- (b) Verify no other consumers grep `tiptap_editor_enabled` in `apps/admin` or any cloud function.
- (c) Then delete from `RemoteConfigContext.tsx` (key, type, default, getValue, mapping).
- Order matters — flipping client code before confirming server-side rollout could lock users out of any Quill fallback if the flag returns false.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Lazy chunk fetch flash between route match and component render | RR's `lazy:` runs in parallel with the loader; existing `<AppLoader>` and route error boundaries cover the gap. No new fallback UI needed for Phase 1 scope. |
| Phase 0 reveals RemoteConfig fetch is the dominant FCP blocker, not bundle size | Documented trade-off — user direction is to keep the provider. Open question logged for revisit. |
| Sentry Replay misses pre-deferral session frames | Acceptable — base error tracking is unaffected; Replay is a debugging aid, not core observability. |
| Quill bundle removal breaks an in-flight Quill draft for a user mid-write | Tiptap is at 100% — there are no active Quill writers. `localStorage` Quill drafts (if any) become dead. Acceptable at 20 MAU; consider a one-line drafts cleanup if found. |
| `tiptap_editor_enabled` flag has consumers we missed | Mitigated by Decision 7's verification gate. |
| Lower `chunkSizeWarningLimit` to 500 surfaces unrelated chunks as warnings | Warnings are non-blocking; we adjust on a per-chunk basis. |
| Lazy-loading routes that use shared utilities causes them to be bundled into multiple chunks | Vite/Rollup deduplicates shared modules into separate chunks automatically. Manual-chunks ensures stable common chunks. |

## Migration Plan

**Phase 0 — Discovery (no PR, ~30 min):**
1. Run `pnpx vite-bundle-visualizer` against production build; save HTML report to `/tmp` and screenshot the top 10 chunks
2. Run Lighthouse on `/` (mobile, Slow 4G, 4× CPU) — capture Performance + Diagnostics panels
3. Write baseline metrics + chunk breakdown into `verify_report.md`

**PR 1 — Quill removal:**
1. Verify Decision-7 gates (a/b/c)
2. Delete `react-quill-new` from `package.json`
3. Delete `apps/web/src/post/components/PostTextEditor.tsx`
4. Simplify `PostEditor.tsx` to render Tiptap directly
5. Delete `useImageUpload.ts` and `useImageUpload.test.ts` entirely (no remaining consumers — Tiptap uses `useTiptapImageUpload`). Update the stale comment in `sanitizeHtml.ts:61-64`.
6. Strip Quill testing branches from `EditorTestPage.tsx`
7. Remove `tiptap_editor_enabled` entries from `RemoteConfigContext.tsx`
8. Verify `convertQuillBulletLists` and its tests remain untouched
9. Run `pnpm --filter web validate` (type-check + lint + tests)
10. Manual: smoke-test post create + edit + view of a legacy Quill post

**PR 2 — Lazy routes + Sentry Replay deferral + Vite chunk cleanup:**
1. Convert non-critical-path routes in `router.tsx` to `lazy:` (per Decision 2 + 3)
2. Update `vite.config.ts` `manualChunks` per Decision 4 (informed by Phase 0 visualizer output)
3. Refactor `main.tsx` Sentry init per Decision 5; add `sentryReplay.ts` with `enableReplay()` helper
4. Run `pnpm --filter web validate`
5. Run `pnpx vite-bundle-visualizer` again; record the new chunk breakdown in `verify_report.md` alongside Phase 0 baseline

**Rollback:** each PR reverts independently via `git revert`. PR 1 has zero runtime dependency on PR 2. PR 2 has zero runtime dependency on PR 1 (lazy routes work identically with or without Quill in the post bundle).

## Open Questions

- Are there other active flags in Firebase Remote Config besides `tiptap_editor_enabled`? Confirm in Phase 1 step (a).
- Phase 0 may surface a heavy dep we didn't anticipate (e.g., `framer-motion`, `embla-carousel`). The chunk plan in Decision 4 must be finalized after the visualizer report, not before.
- Lighthouse main-thread breakdown may reveal that `RemoteConfigProvider`'s synchronous `useRemoteConfigReady` gate is the dominant blocker on `/`. If so, a follow-up proposal should reconsider whether the provider can render its children optimistically with default values, only re-rendering when remote values arrive.

## Testability Notes

Tooling per `openspec/VERIFICATION_CONFIG.md`: Vitest for unit/integration, agent-browser for E2E flows, dev3000 for dev-time timeline, Supabase local Docker for any DB tests.

### Unit (Layer 1) — Vitest

- `contentUtils.test.ts` (existing): all Quill-bullet-conversion cases must stay green. Pure string-in/string-out — the highest-leverage guard for legacy-content rendering.
- `useImageUpload.test.ts`: **deleted with the hook.** Per Decision 6, `useImageUpload` has no consumers after `PostTextEditor` is removed; Tiptap uses its own `useTiptapImageUpload`. The renamed-paste-handler proposal from the original review no longer applies.
- New: a render test for `PostEditor` (Tiptap path only) asserting it mounts without the `forceEditor` prop and without errors.

### Integration (Layer 2) — Vitest + RTL

- `PostEditor` write flow: mount `<PostEditor>` with MSW-mocked Supabase, type text into the Tiptap editor, assert content state updates. Confirms the post-Quill editor wiring is intact end-to-end at the component layer.
- **No Vitest "lazy-route smoke" test.** Vite's test mode resolves dynamic `import()` synchronously — the test would pass trivially regardless of whether `lazy:` is wired correctly. Lazy-route correctness is verified by build-output inspection (below) and Layer 3 E2E.
- **No runtime test for the `RemoteConfigContext` type union change.** Type-membership cannot be asserted at runtime in Vitest. `pnpm --filter web type-check` (already in `pnpm validate`) is the correct gate. The runtime keys-of-defaults assertion would test the wrong thing.

### Build-Output Verification (no test layer, runs alongside PR2)

- After `pnpm --filter web build`, run a script that parses `dist/assets/*.js` and writes to `verify_report.md`:
  - Total bundle size (sum of all chunks)
  - Main entry chunk size
  - Chunk count
  - Top 5 chunks by size
- Compare against the Phase 0 baseline captured in the same file. **Informational, not gating** — first-time data, no historic budget yet. Future PRs can promote this to a CI gate once the baseline is stable.
- The lowered `chunkSizeWarningLimit: 500` in `vite.config.ts` provides Rollup-level warning for chunks that regress past 500KB.

### E2E Network Passthrough (Layer 3) — agent-browser + dev3000

- `/` cold load → capture `dev3000` timeline before/after PR2; informational FCP delta (not gating). The build-output verification above is the structural gate; this is the experiential one.
- Navigate `/boards/list` → click into a board → write a Tiptap post → publish → view. Confirms Quill removal did not regress the editor flow.
- **Legacy Quill post regression guard:** seed a board with a known Quill-format post via SQL fixture at `apps/web/tests/fixtures/legacy-quill-post.sql` (one INSERT containing the canonical Quill bullet HTML — `<ol data-list="bullet"><li>...</li></ol>` and a few inline formats). Load the seed into local Supabase before the E2E run; assert the rendered post shows a semantic `<ul>` (not `<ol>`) and that formatting survives.
- **No automated FCP assertion in CI.** Lighthouse CI is out of scope; we use Sentry RUM as the production signal.

### E2E Local DB (Layer 4) — Supabase local Docker

- Not needed for this change. No schema migrations, no RLS changes, no DB triggers touched. The legacy-Quill SQL fixture (above) is data-only and lives in Layer 3.

### Pre-deployment Checklist (not a test, lives in PR description)

- [ ] Decision 7 (a): Firebase Remote Config console shows `tiptap_editor_enabled` at 100% true with no remaining variations / experiments
- [ ] Decision 7 (b): `apps/admin/`, `functions/`, and `supabase/functions/` searched for any consumer of `tiptap_editor_enabled` — none found
- [ ] Phase 0 baseline (`verify_report.md`) captured before PR2 lands
- [ ] Post-PR2 build-output report appended to `verify_report.md`
