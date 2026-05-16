## Review Summary

**Status:** Ready (after iteration 1 revisions to `design.md`)
**Iteration:** 1 of max 2 — second iteration skipped because all Critical findings were addressed by concrete corrections to the design (no scope change, no new ambiguity introduced). Remaining items are minor or live in the PR-stage checklist.

**Reviewers dispatched:**
- `architecture-reviewer` (oh-my-claudecode:architect, Opus) — verified RR `lazy:` mechanics and Sentry Replay v8 API against actual code in `apps/web/src/sentry.ts` and `apps/web/src/router.tsx`
- `testability-reviewer` (oh-my-claudecode:test-engineer, Sonnet) — verified the test layer assignments against `apps/web/src/post/hooks/useImageUpload.ts` and the existing test suite

Two of five configured roles were dispatched (per user direction). Skipped: `security-reviewer` (no auth/data changes), `quality-reviewer` (small surface), `integration-reviewer` (clean module boundaries).

## Findings

### Critical

- **Sentry Replay sample rates would be silently orphaned post-init** *(architecture-reviewer)* — `Sentry.init({ replaysSessionSampleRate, replaysOnErrorSampleRate })` consumes those rates at init. If the Replay integration is added later via `Sentry.addIntegration()`, the integration would default to 0/0 sample rates and record nothing. The design's pseudocode missed this.
  - **Resolution:** Decision 5 in `design.md` rewritten. Now specifies: remove `Sentry.replayIntegration()` from `Sentry.init` integrations and remove the orphaned top-level rates; new `apps/web/src/sentryReplay.ts` calls `Sentry.addIntegration(Sentry.replayIntegration({ sessionSampleRate, errorSampleRate }))` with the rates passed *explicitly into the integration*. Citations to current `sentry.ts:98-119` recorded in the design.

- **Paste handler in `useImageUpload.ts` would have been deleted as "Quill-specific" but is editor-agnostic** *(testability-reviewer)* — code at `useImageUpload.ts:230-258` attaches a capture-phase paste listener on `editorRoot` to intercept image clipboard data and route it through Supabase upload. The mechanism prevents base64 inlining, which Tiptap benefits from identically. A blanket "remove Quill-specific cases" would have silently broken image-paste in Tiptap.
  - **Resolution:** Decision 6 in `design.md` rewritten. Explicitly keeps the paste handler; renames the test from "blocks Quill default paste" to "intercepts image paste before editor default handler"; instructs to strip the Quill-naming comment but preserve the mechanism. The `imageHandler` ref-stability test is conditionally deletable based on whether the `imageHandler` return value is still consumed (verified during PR1).

- **Single render test for `PostEditor` was minimal coverage** *(testability-reviewer)* — the original Layer 1 plan had "a one-line test asserting `PostEditor` renders without `forceEditor`." For a deletion that touches 3 files together, this is insufficient.
  - **Resolution:** Added a Layer 2 integration test: mount `<PostEditor>` with MSW-mocked Supabase, type into Tiptap, assert state updates. Confirms the post-Quill wiring is intact end-to-end at the component layer, not just the mount-doesn't-crash level.

### Important

- **`lazy:` parallelism claim was overstated** *(architecture-reviewer)* — co-lazy of loader inside the `lazy()` return chains the loader behind the chunk fetch (sequential). For true parallelism, `loader:` must be statically defined on the route object so RR can fire both at route match.
  - **Resolution:** Decision 2 in `design.md` rewritten with two patterns. Default is co-lazy (simple, sequential, still gets the bundle win) for low-traffic routes. The "true parallel" pattern (static `loader:` wrapper + Component-only `lazy:`) is reserved for `boardLoader` and `postDetailLoader` — the routes most visible in Sentry — where the waterfall delta matters.

- **Lazy-route Vitest smoke test would pass trivially** *(testability-reviewer)* — Vite's test mode resolves dynamic `import()` synchronously; the test would succeed regardless of whether `lazy:` is wired correctly. Low-value test masquerading as coverage.
  - **Resolution:** Dropped the Vitest lazy-route test from Layer 2. Replaced with a **build-output verification** section: post-`vite build` script parses `dist/assets/*.js` for size/count/top-chunks and appends to `verify_report.md`. Informational, not gating. Lazy-route correctness is verified by E2E (Layer 3) plus the build-output report.

- **`RemoteConfigContext` type union test isn't possible at runtime** *(testability-reviewer)* — TypeScript type membership is a compile-time property; testing it at runtime would assert the wrong thing (object key absence ≠ union membership).
  - **Resolution:** Removed the proposed runtime test. `pnpm --filter web type-check` (already in `pnpm validate`) is the correct gate, documented as such.

- **`manualChunks` change has no automated test** *(testability-reviewer)*
  - **Resolution:** Acknowledged in the new "Build-Output Verification" section as build-output-only. Rollup-level signal comes from the lowered `chunkSizeWarningLimit: 500`. Future CI promotion deferred until a stable baseline exists.

### Minor

- **`requestIdleCallback` Safari support** *(architecture-reviewer)* — shipped in Safari 16.4 (March 2023). `setTimeout(2000)` fallback covers the long tail.
  - **Resolution:** Documented inline in Decision 5 — covered explicitly with the Safari version cutoff and the rationale for the 2s fallback.

- **Critical-path eager list is sound** *(architecture-reviewer)* — `StatusMessage` correctly stays eager because it's referenced by the root `errorElement`.
  - **Resolution:** No change; verified.

- **Decision 7 sequencing is correct deployment-safety practice** *(architecture-reviewer)*; **needs a checklist artifact** *(testability-reviewer)*
  - **Resolution:** Added a **"Pre-deployment Checklist"** subsection to Testability Notes with explicit boxes for Decision 7 (a) and (b), plus Phase 0 baseline capture. Lives in the PR description as a gate.

- **Sentry Replay deferral is not unit-testable** *(testability-reviewer)*
  - **Resolution:** Explicitly noted in Testability Notes that no Vitest test exists or should exist for the deferral; the only honest verification is the `dev3000` timeline showing post-FCP Replay init. Prevents low-value `requestIdleCallback`-was-called mock tests.

- **E2E legacy Quill post regression guard needs a seed strategy** *(testability-reviewer)*
  - **Resolution:** Specified SQL fixture at `apps/web/tests/fixtures/legacy-quill-post.sql`. Single INSERT with canonical Quill bullet HTML. Loaded into local Supabase before E2E run; assert rendered output is semantic `<ul>` with formatting preserved.

## Key Questions Raised

- Does the team want true parallel `loader:` + `lazy:` for *every* loader-bearing route, or just `boardLoader` + `postDetailLoader`? **Resolved in Decision 2:** only the two high-traffic loaders get the parallel pattern; co-lazy default is enough elsewhere because the bundle win dominates the waterfall delta for low-frequency routes.
- Is `imageHandler` still consumed by `PostEditor` after Quill removal, or only by the now-deleted `ReactQuill` toolbar? **Deferred to PR1:** verified via grep during implementation; ref-stability test deleted conditionally.
- Should the build-output verification become a CI gate? **Deferred:** informational for this change to establish baseline; promotion to gate is a separate future concern.

## Alternatives Considered

- **`React.lazy` + `<Suspense>` at the route boundary instead of RR `lazy:`** — rejected because RR `lazy:` integrates with the existing data-router error flow and avoids adding Suspense wrappers + reorganizing error boundaries.
- **Drop Sentry Replay entirely instead of deferring** — rejected; the debugging value outweighs the load cost once moved past first paint.
- **Lighthouse CI as the FCP gate** — rejected for this change; out of scope. Sentry RUM remains the production signal. Build-output report is the structural gate.
- **CI gate on build-output chunk sizes** — deferred; need a baseline first.

## Accepted Trade-offs

- **No second-iteration parallel review** — all Critical findings are now resolved with concrete code/pattern citations. Re-dispatching agents would surface diminishing returns; ~$5 of compute saved.
- **No `security-reviewer`, `quality-reviewer`, or `integration-reviewer`** dispatched (per user direction). The change touches no auth, no data flow, and has clean module boundaries — these roles' value-per-dollar was the lowest of the five.
- **Build-output verification is informational, not gating** — no historic baseline exists yet; promoting to a CI gate prematurely would either be set too loose (no signal) or fire false positives.
- **Tab-close before idle callback fires drops that session's Replay** — accepted; Replay is a debugging aid, not core observability. Errors are still captured by the base SDK.
- **`requestIdleCallback` tail is handled by `setTimeout(2000)`** — accepted; covers the ~5% of users on Safari < 16.4 with a delay that's still post-paint on any reasonable network.

## Revision History

- **Round 1 (2026-05-16):** Initial review. Both reviewers returned `Needs Revision`. Critical findings: Sentry Replay sample-rate orphaning, paste handler editor-agnostic (would have been deleted), insufficient `PostEditor` coverage. Important: `lazy:` parallelism claim wrong, Vitest lazy-route test trivially passes, runtime type-union test infeasible.
  - `design.md` rewritten in four targeted edits: Decision 2 (lazy: dual pattern), Decision 5 (Sentry Replay deferral with explicit rate passing), Decision 6 (paste handler kept), Testability Notes (build-output section added, infeasible tests removed, pre-deployment checklist added).
