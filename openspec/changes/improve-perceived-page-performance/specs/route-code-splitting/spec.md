## ADDED Requirements

### Requirement: Lazy-Load Non-Critical-Path Routes

The web app SHALL convert every non-critical-path route in `apps/web/src/router.tsx` from eager imports to React Router `lazy:` chunks, so that page components are not included in the initial bundle.

#### Scenario: Non-critical routes use lazy
- **WHEN** `apps/web/src/router.tsx` is inspected
- **THEN** every route that is not on the critical first-paint path MUST define its page component via a `lazy: async () => { … }` block that dynamically imports the component module
- **AND** none of these page components MUST appear as top-level static imports in `router.tsx`

#### Scenario: Lazy block returns Component (and optional errorElement)
- **WHEN** a `lazy:` block executes
- **THEN** it MUST return an object with a `Component` property bound to the page's default export
- **AND** it MAY also return an `errorElement` (e.g., `PermissionErrorBoundary`) when the route requires one

### Requirement: Critical-Path Components Remain Eagerly Imported

The change SHALL keep small, always-rendered components statically imported in `router.tsx`, so that the cold-start path does not pay an additional network round-trip for trivial chunks.

#### Scenario: Eager critical-path allowlist
- **WHEN** `router.tsx` is inspected
- **THEN** the following symbols MUST remain top-level static imports: `RootLayout`, `RootRedirect`, `BottomNavigatorLayout`, `ErrorBoundary`, `PermissionErrorBoundary`, `StatusMessage`, `LoginPage`, `PrivateRoutes`, `PublicRoutes`
- **AND** no `lazy:` block MUST be used for any of these components

### Requirement: High-Traffic Loaders Run in Parallel with Chunk Fetch

Routes whose loaders are on the hottest paths (board detail and post detail) SHALL define a static `loader:` wrapper that dynamically imports the loader module, so that the loader request runs in parallel with the page chunk fetch instead of being chained behind it.

#### Scenario: boardLoader uses parallel pattern
- **WHEN** the `board/:boardId` route definition is inspected
- **THEN** the route MUST set `loader:` to a function that `await import(...)`s the `boardLoader` module and forwards the call
- **AND** the route's `lazy:` block MUST return `{ Component, errorElement }` only — it MUST NOT also return the loader

#### Scenario: postDetailLoader uses parallel pattern
- **WHEN** the post-detail route definition is inspected (`board/:boardId/post/:postId` or equivalent)
- **THEN** the route MUST set `loader:` to a function that `await import(...)`s the post-detail loader module and forwards the call
- **AND** the route's `lazy:` block MUST return the `Component` (and any `errorElement`) only

#### Scenario: Low-traffic routes may use co-lazy default
- **WHEN** a route's loader is small and not in the hot path
- **THEN** the route MAY return both `Component` and `loader` from the same `lazy:` block (co-lazy pattern), accepting that this is sequential rather than parallel

### Requirement: Vite manualChunks Reflects Current Dependencies

The change SHALL rewrite the `manualChunks` configuration in `apps/web/vite.config.ts` so that it matches the real dependency graph and surfaces regressions early.

#### Scenario: Stale firebase/firestore chunk removed
- **WHEN** `vite.config.ts` is inspected after the change
- **THEN** the `manualChunks` configuration MUST NOT reference `firebase/firestore`

#### Scenario: react-vendor chunk preserved
- **WHEN** `vite.config.ts` is inspected
- **THEN** the `manualChunks` configuration MUST keep a `react-vendor` chunk for `react`, `react-dom`, and `react-router-dom`

#### Scenario: Heavy deps surfaced by Phase 0 get explicit chunks
- **WHEN** the Phase 0 bundle visualizer report identifies a heavy non-vendor dependency (e.g., `@sentry/react/replay`, `recharts`, `react-markdown`)
- **THEN** `manualChunks` MUST define an explicit chunk for that dependency

#### Scenario: chunkSizeWarningLimit lowered
- **WHEN** `vite.config.ts` is inspected
- **THEN** `build.chunkSizeWarningLimit` MUST be set to `500` (down from `1000`)

### Requirement: Defer Sentry Replay Initialization Past First Paint

The change SHALL move Sentry Replay integration off the synchronous init path so that its bundle and initialization cost do not contribute to first paint, while preserving its configured sample rates.

#### Scenario: Replay removed from Sentry.init
- **WHEN** `apps/web/src/sentry.ts` is inspected after the change
- **THEN** the `integrations` array passed to `Sentry.init({...})` MUST NOT contain `Sentry.replayIntegration()`
- **AND** the top-level `replaysSessionSampleRate` and `replaysOnErrorSampleRate` options MUST be removed from `Sentry.init({...})`
- **AND** `SENTRY_CONFIG.REPLAY_SAMPLE_RATE` and `SENTRY_CONFIG.REPLAY_ON_ERROR_RATE` MUST remain exported

#### Scenario: Deferred Replay loader receives rates explicitly
- **WHEN** `apps/web/src/sentryReplay.ts` is inspected
- **THEN** it MUST export an `enableReplay()` function that calls `Sentry.addIntegration(Sentry.replayIntegration({ sessionSampleRate, errorSampleRate }))` with the rates read from `SENTRY_CONFIG`

#### Scenario: enableReplay invoked after first paint
- **WHEN** `apps/web/src/main.tsx` is inspected
- **THEN** after `initSentry()` runs, the code MUST schedule `import('./sentryReplay').then(m => m.enableReplay())` via `requestIdleCallback` (with `{ timeout: 4000 }`) when available
- **AND** it MUST fall back to `setTimeout(loadReplay, 2000)` when `requestIdleCallback` is not available (Safari < 16.4)

### Requirement: Build-Output Verification of Bundle Size

The change SHALL append a measurable build-output report to `verify_report.md`, so that bundle deltas are recorded objectively against the Phase 0 baseline.

#### Scenario: Phase 0 baseline captured before lazy-routes PR lands
- **WHEN** the lazy-routes PR is opened
- **THEN** `verify_report.md` MUST already contain a Phase 0 section with total bundle size, main entry chunk size, chunk count, and the top 5 chunks by size, captured via `pnpx vite-bundle-visualizer` on the pre-change build
- **AND** it MUST also contain Lighthouse FCP/LCP medians for `/` on a throttled "Slow 4G + 4× CPU" mobile profile

#### Scenario: Post-change build-output report appended
- **WHEN** the lazy-routes PR is opened
- **THEN** `verify_report.md` MUST also contain a post-change section with the same metrics (total size, main entry size, chunk count, top 5 chunks)
- **AND** the report MUST clearly distinguish Phase 0 baseline from the post-change values for direct comparison
