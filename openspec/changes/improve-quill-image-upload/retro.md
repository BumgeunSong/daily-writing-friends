## Change Retro: improve-quill-image-upload

### Timeline

1. **Explore**: User reported 4 pain points (no drag&drop, no paste, no multi-file, no large file). Initially analyzed TipTap path — user corrected that TipTap is disabled and untested. Re-analyzed against Quill editor. Confirmed all 4 features are achievable with standard DOM APIs.

2. **Proposal**: Split into two focused changes (image upload + TipTap removal). User prioritized image upload first.

3. **Proposal Review**: 6-agent review. No major concerns. Confirmed scope and approach.

4. **Design**: Detailed technical design covering hook rewrite, validation extraction, event handling patterns (drag counter, paste interception), cursor position capture for multi-file.

5. **Design Review**: 5-agent review caught critical cursor position race condition during multi-file upload. Led to "capture at sequence start" approach.

6. **Specs**: 19 scenarios across 8 requirements covering all features + edge cases.

7. **Tasks**: 14 implementation tasks + 9 test tasks (unit, integration, E2E).

8. **Apply**: All 14 implementation tasks completed smoothly. Key decision: complete rewrite of `useImageUpload.ts` rather than incremental patches — cleaner result.

9. **Verify**: Unit (22) and integration (8) tests all passing. One test timeout bug found and fixed (HEIC fallback test needed FileReader/Image mocks). Total: 537 tests passing.

10. **Spec Alignment**: All 19 requirements aligned. No drift.

11. **Pull Request**: PR #500 created. All CI checks passed (test, SonarCloud, GitGuardian).

12. **Manual Testing & Hotfixes**: Testing on localhost revealed three production issues:
    - **Firebase Storage 403**: `postImages` rules required `isAuthenticated()` (Firebase Auth), but the app had migrated to Supabase Auth — no Firebase Auth token was being sent. Fixed by removing auth requirement from storage rules. Also configured CORS on the GCS bucket to allow `localhost:5173`.
    - **Editor crash after upload**: `imageHandler` depended on `isUploading` state, causing `modules` to recreate on every upload → Quill reinitializes. Fixed by using `isUploadingRef.current` instead.
    - **Paste duplicate image**: Quill's default paste handler inserted a base64 image before our custom handler could intercept. Fixed by registering paste handler in capture phase with `stopPropagation`.

13. **Second Review Round**: Addressed remaining comments — added `aria-busy` for accessibility, relaxed E2E assertion for emulator compatibility.

### Wins

- **Validation extraction** (design phase): Moving validation to pure functions (`ImageValidation.ts`) made it trivial to write 22 unit tests with full coverage. This was a design review suggestion that paid off significantly.

- **Design review catching cursor race condition**: The multi-file cursor offset approach (capture at start, increment on success) would have been a subtle bug if not caught during design.

- **DOM-level event handling**: Using standard DOM APIs (addEventListener on editorRoot) instead of Quill-specific APIs made the implementation framework-agnostic and simpler. If Quill is ever swapped, these handlers still work.

- **HEIC fallback pattern**: try-catch with graceful degradation means users are never blocked — worst case they upload the original file.

- **Sequential multi-file with progress toast**: Simple loop with `succeeded`/`failed` counters + `aggregateResults` gave clear user feedback without complexity.

### Misses

- **Knowledge Gap — TipTap analysis**: Initially spent time analyzing the TipTap editor path before user corrected that it's disabled. Should have checked remote config / feature flags first.

- **Knowledge Gap — Auth migration**: Didn't account for the Supabase Auth migration when writing Firebase Storage rules. The rules assumed `request.auth` would be populated, but Supabase Auth doesn't provide Firebase Auth tokens. This caused a production 403 that required multiple debugging rounds.

- **Tool Gap — HEIC test timeout**: The integration test for HEIC fallback timed out because `resizeImageForUpload` still runs after HEIC conversion fails, requiring FileReader/Image mocks even for the "failure" test case. This wasn't obvious from the code structure — the fallback path still exercises the full resize pipeline.

- **Design Gap — Quill modules stability**: The `imageHandler → toolbarImageHandler → modules` dependency chain wasn't identified during design. Any state variable in `imageHandler`'s deps causes Quill to fully reinitialize. This is a Quill-specific footgun that should be documented.

- **Design Gap — Paste event ordering**: Quill registers its own paste handler on the editor root. Our handler in the bubbling phase ran after Quill's, causing duplicate image insertion. Capture phase was needed but wasn't anticipated.

- **Process Gap — E2E tests unrunnable**: The 4 Playwright E2E tests are written but can't be verified without Firebase emulators running. This leaves a coverage gap that's only discoverable at runtime.

- **Process Gap — No localhost testing before PR**: The initial PR was created without testing uploads from localhost, which would have caught the CORS and auth issues earlier.

### Improvement Ideas

- **Feature flag check in explore phase**: When analyzing an existing feature, always check remote config / feature flags first to confirm which code path is actually active. Add this as a standard step in the explore workflow.

- **Test mock audit step**: After writing integration tests for async pipelines, trace the full execution path to identify all browser APIs that need mocking. The HEIC test timeout would have been caught by asking "what does processImageForUpload call after the catch block?"

- **E2E smoke test in CI**: Even without full Firebase emulators, a lightweight Playwright smoke test (just loading the editor page) would catch import errors and basic rendering issues. Consider adding a minimal E2E step to the CI pipeline.

- **Hook rewrite vs patch decision framework**: The complete rewrite of `useImageUpload.ts` worked well here because the old hook was small (~60 lines). For larger hooks, an incremental approach might be safer. Document a guideline: "rewrite if original < 100 lines and API changes significantly."

- **Auth migration checklist**: When any service depends on Firebase Auth, verify it still works after Supabase Auth migration. Add "check Storage rules auth assumptions" to the migration checklist.

- **Quill modules stability rule**: Never put volatile state (like `isUploading`) in the dependency chain of Quill `modules`. Use refs for guards inside callbacks. Document this as a project convention.

- **Localhost smoke test before PR**: Add a manual testing step to the eddys-flow workflow between `verify` and `pull-request` — test the actual feature from localhost against real (or emulated) backend services.
