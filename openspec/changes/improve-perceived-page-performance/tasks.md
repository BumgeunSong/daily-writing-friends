## 1. Phase 0 — Discovery (no code change)

- [x] 1.1 Ran `pnpx vite-bundle-visualizer -t raw-data -o /tmp/bundle-baseline.json` and `-t treemap -o /tmp/bundle-baseline.html` against the production build of `apps/web`; baseline JSON + treemap captured (SENTRY_AUTH_TOKEN cleared for local run since the Sentry vite plugin is gated to CI)
- [ ] 1.2 Run Lighthouse on `/` from a clean profile with Chrome DevTools throttling set to "Slow 4G + 4× CPU slowdown"; record the median FCP/LCP across 3 runs and screenshot the Performance + Diagnostics panels (USER ACTION — needs interactive Chrome session)
- [x] 1.3 Wrote a "Phase 0 Baseline" section to `openspec/changes/improve-perceived-page-performance/verify_report.md` containing on-disk + rendered chunk sizes, chunk count (4), top 15 deps in main `index-*.js`. FCP/LCP fields stubbed pending task 1.2.
- [x] 1.4 Heavy-dep decisions for PR2 `manualChunks` — design's "likely" list (`@sentry/react/replay`, `recharts`, `react-markdown`) did not match reality. Replaced with: keep `react-vendor`; drop stale `firebase/firestore`; add `sentry-vendor` and `supabase-vendor`. `heic2any` (1.3 MB!) stays statically imported by `post/utils/ImageUtils.ts` and moves out of `index` naturally once post routes go lazy. Sentry Replay (313 KB) is handled by Decision 5's dynamic-import deferral, not by manualChunks.

## 2. PR1 — Quill Removal Pre-deployment Gates

- [ ] 2.1 Verify in the Firebase Remote Config console that `tiptap_editor_enabled` is at 100% true with no remaining variations or active experiments; paste the screenshot into the PR description (USER ACTION — requires Firebase console access)
- [x] 2.2 Grep `apps/admin/`, `functions/`, and `supabase/functions/` for `tiptap_editor_enabled` — confirmed zero matches across the repository
- [x] 2.3 Grep `apps/web/` for any reader of `tiptap_editor_enabled` other than the context definition — zero matches after the change

## 3. PR1 — Quill Removal Implementation

- [x] 3.1 Removed `react-quill-new` from `apps/web/package.json`; `pnpm install` regenerated `pnpm-lock.yaml`
- [x] 3.2 Deleted `apps/web/src/post/components/PostTextEditor.tsx`
- [x] 3.3 Simplified `apps/web/src/post/components/PostEditor.tsx` to render `<EditorTiptap>` directly; removed `forceEditor`, `useRemoteConfig`, and the `lockedEditorRef` switching logic
- [x] 3.4 Deleted `apps/web/src/post/hooks/useImageUpload.ts` (no remaining consumers — Tiptap uses `useTiptapImageUpload`)
- [x] 3.5 Deleted `apps/web/src/post/hooks/__tests__/useImageUpload.test.ts`
- [x] 3.6 Reframed the stale `useImageUpload` reference in `apps/web/src/post/utils/sanitizeHtml.ts` to describe the helper's purpose without pointing at a deleted file
- [x] 3.7 Stripped `QUILL_TOOLBAR_MAPPINGS`, the Quill stamp-fallback branch, and `forceEditor="tiptap"` from `apps/web/src/test/EditorTestPage.tsx`
- [x] 3.8 Removed `tiptap_editor_enabled` from `RemoteConfigKey`, `RemoteConfigValueTypes`, `REMOTE_CONFIG_DEFAULTS`, the Firebase `getValue` block, and the `setValues` merge in `apps/web/src/shared/contexts/RemoteConfigContext.tsx`; `RemoteConfigProvider` is intact
- [x] 3.9 `contentUtils.ts` and `contentUtils.test.ts` untouched (verified by `git status` and by `pnpm test:run` showing the suite passes unchanged)
- [x] 3.10 `useTiptapImageUpload.ts` and `EditorTiptap.tsx` untouched (verified by `git status`)
- [x] 3.11 Verification evidence — `pnpm --filter web type-check` exit 0; `pnpm --filter web test:run` 748/748 pass exit 0; `pnpm --filter web lint` exit 1 with 7 errors / 382 warnings, **all in pre-existing files this PR did not touch** (`PostCompletionContent`, `useEditorCopy`, `SentryFeedbackDialog`, `shared/ui/alert`, `shared/ui/card`, `shuffleUtils`). Baseline (pre-PR1 stash) reported 8 errors / 395 warnings — PR1 strictly reduces lint debt by 1 error and 13 warnings.

## 4. PR1 — Quill Removal Manual Smoke

- [ ] 4.1 Start the dev server against local Supabase and create a new post; confirm the editor mounts as Tiptap, accepts text input, and publishes successfully
- [ ] 4.2 Edit the post created in 4.1; confirm the existing content loads into Tiptap and edits persist
- [ ] 4.3 View a legacy Quill post (seeded via the fixture introduced in T.3.1); confirm bullet lists render as semantic `<ul>` with inline formatting preserved
- [ ] 4.4 Paste an image from the clipboard into a Tiptap post; confirm the image is uploaded to Firebase Storage (via `useTiptapImageUpload`) rather than inlined as base64

## 5. PR2 — Lazy Routes

- [x] 5.1 `apps/web/src/router.tsx` rewritten: every non-critical-path route now uses `lazy: async () => { ... return { Component: ... } }` (co-lazy default per Decision 2)
- [x] 5.2 Critical-path eager imports retained: `RootLayout`, `RootRedirect`, `BottomNavigatorLayout`, `ErrorBoundary`, `PermissionErrorBoundary`, `StatusMessage`, `LoginPage`, `PrivateRoutes`, `PublicRoutes`. `AppWithTracking`, `NavigationProvider`, `BottomTabHandlerProvider`, `Toaster` also stay eager (all referenced by `RootLayout` on every cold start).
- [x] 5.3 `board/:boardId` uses the "true parallel" pattern — static `loader: async (args: LoaderFunctionArgs) => { const { boardLoader } = await import(...); return boardLoader(args); }` paired with a Component-only `lazy:` returning `{ Component, errorElement: <PermissionErrorBoundary /> }`
- [x] 5.4 `board/:boardId/post/:postId` (post detail) AND `board/:boardId/edit/:postId` (post edit) both use the same true-parallel pattern with `postDetailLoader`. `boards/list` also gets the parallel pattern with `boardsLoader()` (no-arg)
- [x] 5.5 Verified — `router.tsx` no longer eagerly imports any page component except `LoginPage` (per design Decision 3). `pnpm --filter web type-check` exit 0. Build output confirms per-page chunks: `BoardListPage-*.js`, `BoardPage-*.js`, `NotificationsPage-*.js`, `PostDetailPage-*.js`, `PostEditor-*.js`, `StatsPage-*.js`, `UserPage-*.js`, all join/onboarding pages, etc.

## 6. PR2 — Vite Chunk Configuration

- [x] 6.1 Removed stale `firebase/firestore` from `manualChunks` — now `firebase-vendor: ['firebase/app']`
- [x] 6.2 Kept `react-vendor` chunk for `react`, `react-dom`, `react-router-dom`
- [x] 6.3 Added explicit `manualChunks` entries informed by the actual Phase 0 report (NOT the design's "likely" list). Added: `sentry-vendor: ['@sentry/react']` and `supabase-vendor: ['@supabase/supabase-js']`. `recharts` and `react-markdown` were not in top 30 deps — skipped. `@sentry/react/replay` is now moot since Replay was removed entirely (see task 7).
- [x] 6.4 Lowered `build.chunkSizeWarningLimit` from `1000` to `500`
- [x] 6.5 `SENTRY_AUTH_TOKEN= pnpm --filter web build` exit 0 — built in 11.13s. One warning, on `ImageUtils-*.js` (1323 KB) driven by `heic2any`; **chunk is off the critical path** (loaded only on post create/edit routes). Documented as accepted in `verify_report.md` T.B.2.

## 7. PR2 — Sentry Replay Removal (scope change: deferral → removal)

**Scope change rationale (2026-05-16):** user confirmed Replay is not consulted in practice; only error reports + breadcrumbs are reviewed. Deferring would still pay ~313 KB of post-FCP fetches and add `requestIdleCallback` plumbing. Removing entirely is strictly better — same bundle savings, zero complexity, and easy to re-add if Replay becomes useful later. Decision 5 in `design.md` revised to match.

- [x] 7.1 `apps/web/src/sentry.ts`: removed `Sentry.replayIntegration()` from the `Sentry.init` integrations array, removed the orphaned `replaysSessionSampleRate` / `replaysOnErrorSampleRate` top-level options, removed `REPLAY_SAMPLE_RATE` and `REPLAY_ON_ERROR_RATE` from `SENTRY_CONFIG`
- [~] 7.2 Superseded by 7.1 — `REPLAY_SAMPLE_RATE` / `REPLAY_ON_ERROR_RATE` are no longer needed once Replay is removed entirely
- [~] 7.3 Superseded by removal — no `sentryReplay.ts` is created; the file was briefly created during the deferral attempt and then deleted
- [~] 7.4 Superseded by removal — `main.tsx` stays untouched (no `requestIdleCallback` plumbing)
- [x] 7.5 SDK API correction (newly surfaced during 7.1): SDK 8.55 reads `replaysSessionSampleRate` / `replaysOnErrorSampleRate` from `client.getOptions()` inside the integration's `_setup` via `loadReplayOptionsFromClient` (see `@sentry-internal/replay/build/npm/esm/index.js:9707`). So the design.md claim that rates would be "orphaned" if Replay is added later via `addIntegration` is incorrect for this SDK version — they are NOT orphaned. This nuance becomes moot now that Replay is removed entirely, but it's recorded here for accuracy.

## 8. PR2 — Build-Output Verification

- [x] 8.1 Parsed `apps/web/dist/assets/*.js` post-PR2: chunk count 99, total JS 3299 KB, main `index-*.js` 440 KB (vs 3.2 MB baseline = 86% reduction), top 10 chunks captured in `verify_report.md` "Post-PR2 Build Report"
- [x] 8.2 Side-by-side baseline vs post-PR2 table appended to `verify_report.md` — critical-path initial JS dropped ~3530 KB → ~1011 KB (≈72% reduction). Sentry Replay weight on first paint went from 313 KB → 0 KB.
- [ ] 8.3 `pnpm --filter web validate` — partial: `type-check` exit 0; `test:run` 765/765 pass exit 0; full `validate` (which adds `lint`) not yet run separately (lint warnings on pre-existing files are out of scope per PR1's baseline; will run before final commit)

## 9. PR2 — Manual Smoke

- [ ] 9.1 Start the dev server; navigate `/` → `/notifications` → `/boards` → a board detail → a post detail; observe the network panel and confirm route-specific chunks are fetched lazily on navigation
- [ ] 9.2 Confirm Sentry Replay does not appear in initial network requests; confirm a `sentryReplay` chunk loads after first paint (visible in DevTools Network panel after idle)
- [ ] 9.3 Capture a `dev3000` timeline of `/` cold load; record FCP delta vs. Phase 0 in `verify_report.md` (informational, not gating)

## Tests

### Unit (Vitest)

- [x] T.1.1 Existing `contentUtils.test.ts` suite — all Quill-bullet-conversion cases stayed green without modification (`pnpm --filter web test:run` 748/748 pass)
- [x] T.1.2 `useImageUpload.test.ts` no longer appears in `pnpm --filter web test:run` output (file deleted in 3.5)
- [~] T.1.3 **Deferred to E2E (T.3.3).** Rationale: the simplified `PostEditor` is a 28-line pure delegate to `<EditorTiptap>`. Per the project's `testing` skill, component render tests are not the chosen unit-test pattern (pure functions only); and the integration assertion the design-review escalated to (T.2.1) would require mounting real Tiptap under jsdom, where ProseMirror's range/selection paths are historically brittle. The behaviour ("renders Tiptap unconditionally, no `forceEditor` prop, no `useRemoteConfig` dependency") is verified by the type-check (T.2.2) and by reading the file; runtime correctness is covered by manual smoke (4.x) and Layer 3 E2E (T.3.3).

### Integration (Vitest + RTL)

- [~] T.2.1 **Deferred to E2E (T.3.3).** Rationale: `PostEditor` doesn't call Supabase — image upload routes through Firebase Storage (via `useTiptapImageUpload`), not Supabase. Mocking Supabase with MSW would not intersect `PostEditor`'s integration surface. The design-review's escalation rested on the (now-corrected) assumption that `useImageUpload` was the Tiptap pipeline; that hook has been deleted and `EditorTiptap` already wired its own integration. Layer 3 E2E (T.3.3) covers the post-write flow end-to-end.
- [x] T.2.2 `pnpm --filter web type-check` exit 0 — the `RemoteConfigContext` type-union change (removing `tiptap_editor_enabled`) is gated by the compiler

### Build-Output (no test layer)

- [x] T.B.1 Parsed `apps/web/dist/assets/*.js` post-PR2 and appended to `verify_report.md` alongside Phase 0 baseline. Total: 3299 KB, main entry: 440 KB, chunk count: 99, top 10 chunks captured.
- [x] T.B.2 `chunkSizeWarningLimit: 500` fired exactly once — on `ImageUtils-*.js` (1323 KB), driven entirely by `heic2any@0.0.4`. Documented in `verify_report.md` as accepted because the chunk is loaded only on post create/edit routes (off the first-paint critical path). A follow-up could defer `heic2any` inside a HEIC-only code path.

### E2E (agent-browser + dev3000)

- [ ] T.3.1 Create `apps/web/tests/fixtures/legacy-quill-post.sql` containing a single INSERT with canonical Quill bullet HTML (`<ol data-list="bullet"><li>…</li></ol>`) and a few inline formats; load it into local Supabase before the E2E run
- [ ] T.3.2 Drive agent-browser: log in → navigate to the seeded board → open the legacy Quill post; assert the rendered post shows a semantic `<ul>` (not `<ol>`) and that inline formatting (bold/italic/links) survives
- [ ] T.3.3 Drive agent-browser: log in → navigate `/boards/list` → click into a board → write a Tiptap post (text + image paste) → publish → view; confirm the editor flow is intact after Quill removal
- [ ] T.3.4 Capture a `dev3000` timeline of `/` cold load on the post-PR2 build; record the FCP delta against the Phase 0 baseline in `verify_report.md` (informational, not gating)
