## 1. Phase 0 — Discovery (no code change)

- [ ] 1.1 Run `pnpx vite-bundle-visualizer` against the production build of `apps/web`; save the HTML report to `/tmp` and capture screenshots of the top 10 chunks
- [ ] 1.2 Run Lighthouse on `/` from a clean profile with Chrome DevTools throttling set to "Slow 4G + 4× CPU slowdown"; record the median FCP/LCP across 3 runs and screenshot the Performance + Diagnostics panels
- [ ] 1.3 Append a "Phase 0 Baseline" section to `openspec/changes/improve-perceived-page-performance/verify_report.md` containing: total bundle size, main entry chunk size, chunk count, top 5 chunks by size, FCP p75 median, LCP p75 median
- [ ] 1.4 Decide whether Phase 0 surfaces unexpected heavy deps (e.g., `framer-motion`, `embla-carousel`) that should also get explicit `manualChunks` entries in PR2

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

- [ ] 5.1 In `apps/web/src/router.tsx`, convert every non-critical-path route to a `lazy: async () => { … }` block per Decision 2 (default co-lazy pattern)
- [ ] 5.2 Keep these symbols as top-level static imports in `router.tsx`: `RootLayout`, `RootRedirect`, `BottomNavigatorLayout`, `ErrorBoundary`, `PermissionErrorBoundary`, `StatusMessage`, `LoginPage`, `PrivateRoutes`, `PublicRoutes`
- [ ] 5.3 For the `board/:boardId` route, apply the "true parallel" pattern: static `loader:` that dynamically imports `boardLoader` and forwards the call; `lazy:` returns `{ Component, errorElement: <PermissionErrorBoundary /> }` only
- [ ] 5.4 For the post-detail route, apply the same true-parallel pattern with `postDetailLoader`
- [ ] 5.5 Confirm no eager imports of page components remain in `router.tsx` for non-critical-path routes

## 6. PR2 — Vite Chunk Configuration

- [ ] 6.1 In `apps/web/vite.config.ts`, remove the stale `firebase/firestore` entry from `manualChunks`
- [ ] 6.2 Keep `react-vendor` chunk for `react`, `react-dom`, `react-router-dom`
- [ ] 6.3 Add explicit `manualChunks` entries for the heavy deps surfaced by Phase 0 (likely `@sentry/react/replay`, `recharts`, `react-markdown` — finalize from the actual visualizer report)
- [ ] 6.4 Lower `build.chunkSizeWarningLimit` from `1000` to `500`
- [ ] 6.5 Run `pnpm --filter web build` and confirm the build succeeds (warnings allowed)

## 7. PR2 — Sentry Replay Deferral

- [ ] 7.1 In `apps/web/src/sentry.ts`, remove `Sentry.replayIntegration()` from the `integrations` array passed to `Sentry.init({...})` and remove the top-level `replaysSessionSampleRate` / `replaysOnErrorSampleRate` options
- [ ] 7.2 Confirm `SENTRY_CONFIG.REPLAY_SAMPLE_RATE` and `SENTRY_CONFIG.REPLAY_ON_ERROR_RATE` remain exported from `sentry.ts`
- [ ] 7.3 Create `apps/web/src/sentryReplay.ts` exporting `enableReplay()` that calls `Sentry.addIntegration(Sentry.replayIntegration({ sessionSampleRate, errorSampleRate }))` using the rates from `SENTRY_CONFIG`
- [ ] 7.4 In `apps/web/src/main.tsx`, after `initSentry()`, schedule `import('./sentryReplay').then(m => m.enableReplay())` via `requestIdleCallback(loadReplay, { timeout: 4000 })` with a `setTimeout(loadReplay, 2000)` fallback when `requestIdleCallback` is unavailable

## 8. PR2 — Build-Output Verification

- [ ] 8.1 After PR2's `pnpm --filter web build`, run a script that parses `apps/web/dist/assets/*.js` and writes total bundle size, main entry chunk size, chunk count, and top 5 chunks by size to `verify_report.md` under a "Post-PR2 Build Report" section
- [ ] 8.2 Append a side-by-side comparison of the Phase 0 baseline vs. post-PR2 metrics in `verify_report.md`
- [ ] 8.3 Run `pnpm --filter web validate` and resolve any failures

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

- [ ] T.B.1 After `pnpm --filter web build`, parse `apps/web/dist/assets/*.js` and emit total bundle size, main entry size, chunk count, and top 5 chunks; append to `verify_report.md` alongside the Phase 0 baseline (informational, not gating)
- [ ] T.B.2 Confirm the lowered `chunkSizeWarningLimit: 500` in `vite.config.ts` produces Rollup warnings only for chunks that legitimately exceed 500KB; document any expected warnings in the PR description

### E2E (agent-browser + dev3000)

- [ ] T.3.1 Create `apps/web/tests/fixtures/legacy-quill-post.sql` containing a single INSERT with canonical Quill bullet HTML (`<ol data-list="bullet"><li>…</li></ol>`) and a few inline formats; load it into local Supabase before the E2E run
- [ ] T.3.2 Drive agent-browser: log in → navigate to the seeded board → open the legacy Quill post; assert the rendered post shows a semantic `<ul>` (not `<ol>`) and that inline formatting (bold/italic/links) survives
- [ ] T.3.3 Drive agent-browser: log in → navigate `/boards/list` → click into a board → write a Tiptap post (text + image paste) → publish → view; confirm the editor flow is intact after Quill removal
- [ ] T.3.4 Capture a `dev3000` timeline of `/` cold load on the post-PR2 build; record the FCP delta against the Phase 0 baseline in `verify_report.md` (informational, not gating)
