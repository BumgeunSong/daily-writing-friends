## Review Summary

**Status**: Needs Revision → Ready (Round 2 applied; remaining items accepted)
**Iteration**: 2 of max 2

Five parallel reviewers (architecture, security, quality, testability, integration) ran in parallel. One Critical (testability) was raised and addressed in Round 2. Most Important items folded into design.md; remaining minors accepted.

## Architecture

`oh-my-claudecode:architect` — clean review. Boundaries (`resizeImageBlob` pure utility / `uploadUserProfilePhoto` orchestration) are right. `uploadUserProfilePhoto` bundling resize + upload + cache invalidation is acceptable cohesion, not an SRP violation. One Important: document the URL-derivation contract in `thumbnailUrl.ts` so a future server-side pipeline knows what URL scheme to produce.

## Security

`oh-my-claudecode:security-reviewer` — one **Important** finding: `firebase/storage.rules` has no `match /profilePhotos/{userId}` rule. The app uses Supabase Auth (per the comment on the `postImages/` rule at line 45), so the standard Firebase Auth `isOwner` pattern is not applicable. Either uploads currently work by some other path (signed URLs, admin SDK), or the production rules differ from the repo. Either way, this PR must explicitly add a rule so the new upload path is well-defined. Minor: decompression-bomb dimension cap; Canvas EXIF stripping (positive — privacy win); `cacheControl: public` is fine for avatar bytes.

## Quality & Performance

`oh-my-claudecode:quality-reviewer` — no Critical. Two Important: (a) `UnsupportedImageError` / `FileTooLargeError` need explicit module location and i18n-able message keys, (b) `OffscreenCanvas` scope discipline note (no `close()` API; rely on letting it fall out of function scope). Minor: center-crop focal point, `isUploadingAvatar` could be a hook for reuse, loading copy TBD.

## Testability

`oh-my-claudecode:test-engineer` — one **Critical**: Vitest's default jsdom/happy-dom environment lacks real Canvas — `createImageBitmap`, `drawImage`, `toBlob` are stubs or absent. Several unit-test assertions in design.md (dimension check, center-crop pixel check) cannot be reliably verified against mocks. **Fix**: narrow unit tests to mock-friendly assertions (call args, error-path branching). Move dimension/crop correctness to either `@vitest/browser` mode (Chromium) or a Node `canvas` package shim in a dedicated test config. Important: visual regression baseline (12 surfaces × 3 states × 2 viewports = ~72 PNGs) is disproportionate maintenance; narrow to 3–4 representative surfaces. Minor: rename the "HEIC happy path" test case to reflect that it tests the `UnsupportedImageError` fallback (the real conversion happens at picker level, before JS sees the File).

## API & Integration

`oh-my-claudecode:code-reviewer` — approves with one Important: `MockCommentRow` exclusion needs an explicit rationale (it renders static fixture data, not user-uploaded avatars, so the resize pipeline doesn't apply). Without this note, future maintainers will file it as a missed migration. Minor: `useThumbnailUrl` rename / relocation to `post/` is good follow-up cleanup but not blocking. `PostUserProfile` and other existing callers are fully compatible with the simplified `ComposedAvatar`.

## Consolidated Findings

### Critical

**TEST-1. Canvas unit tests against jsdom/happy-dom mocks are hollow.**
*(testability)* The design's "verify center pixel matches" and "verify dimensions are exactly 256×256" assertions cannot run against jsdom's Canvas stubs. **Fix**: split tests by what they can actually prove against mocks (call args, error paths, conditional branching) vs. what needs a real Canvas environment (dimensions, pixel correctness). For real-Canvas tests, declare a separate Vitest project using either `@vitest/browser` (Chromium) or `node-canvas`. Document this split explicitly in design.md.

### Important

**SEC-1. Storage rule for `profilePhotos/`.**
*(security)* No `match /profilePhotos/{userId}` rule in `firebase/storage.rules`. **Fix**: add a permissive rule matching the existing `postImages/` pattern (the app uses Supabase Auth, not Firebase Auth, so ownership enforcement via `request.auth.uid` is not feasible without separate work). This is not a security regression — it formalizes the current state. Document as accepted tradeoff that strict per-uid write enforcement requires Firebase Auth integration which is out of scope.

**QUAL-1. Error type contract.**
*(quality)* `UnsupportedImageError` and `FileTooLargeError` need: (a) a shared base class (e.g., `AvatarUploadError`), (b) a `messageKey` property for i18n, (c) explicit module location (`apps/web/src/shared/errors/avatarUpload.ts` or similar). Inline Korean strings in the utility break i18n if the app adds English later. **Fix**: revise design D2 to specify the error class structure.

**QUAL-2. `OffscreenCanvas` scope discipline.**
*(quality)* No `close()` API on OffscreenCanvas; the only mitigation against leaks under rapid retry is letting the variable fall out of function scope. **Fix**: add an explicit note in D2 algorithm.

**TEST-2. Visual regression baseline scope.**
*(testability)* ~72 baseline PNGs is disproportionate maintenance for a 46-user app. **Fix**: narrow to 3–4 representative surfaces (one comment avatar, one notification, one profile page, one fallback). Skip loading-state snapshots (use DOM assertions like `aria-busy` instead).

**TEST-3. Center-crop correctness assertion.**
*(testability)* The "verify center pixel" assertion needs a synthetic fixture + node-canvas, or downgrade to math-only (unit-test `sx/sy/sw/sh` calculation in isolation). **Fix**: documented in revised Testability Notes.

**INT-1. `MockCommentRow` exclusion rationale.**
*(integration)* Without a note, future maintainers will file it as a missed migration. **Fix**: add a one-line comment + a note in design.md's Migration Plan explaining that `MockCommentRow` renders static fixture data and therefore does not benefit from the resize pipeline.

**ARCH-1. URL-derivation contract documentation.**
*(architecture)* `thumbnailUrl.ts` encodes the Firebase Resize extension's `_128x128` naming convention. If a future server-side resize pipeline emerges (for postImages), it should know to produce URLs matching this convention. **Fix**: add a one-line comment in `thumbnailUrl.ts` documenting the URL-derivation contract.

### Minor

- Decompression-bomb dimension cap (`bitmap.width > 8192 || bitmap.height > 8192`) — minor harden. Accepted.
- Center-crop focal point ~33% from top for face avatars — documented as known tradeoff.
- `isUploadingAvatar` state ownership on `EditAccountPage` — extract to `useAvatarUpload()` hook only if a second upload surface emerges. Not now.
- Loading-state copy ("변환 중…" vs alternatives) — settled at "변환 중…" to close the open question.
- `useThumbnailUrl` rename / relocation to `post/hooks/` — follow-up cleanup, not blocking.
- HEIC E2E test renamed to reflect it tests the `UnsupportedImageError` fallback, not the real auto-conversion (which happens at picker level).

## Accepted Trade-offs

- **Permissive `profilePhotos/` Storage rule** (matching existing `postImages/` pattern): does not enforce per-uid write ownership. The proper fix requires Firebase Auth integration which is out of scope for an app that uses Supabase Auth as the primary auth backend. This is not a security regression — it formalizes the current state.
- **Real-Canvas unit tests via a separate Vitest config**: adds test-infra setup (node-canvas dependency or `@vitest/browser` Chromium mode). Accepted because the alternative (no testability for dimension/crop correctness) is worse.
- **Visual regression baseline narrowed to 3–4 surfaces**: trades coverage breadth for maintenance sustainability. Accepted given app scale.
- **Center-crop default**: face avatars may show a slightly low focal point. Documented; can be addressed with `cropGravity` option in a future PR.

## Revision History

- **Round 1** (2026-05-17): Five reviewers ran in parallel. One Critical (testability — Canvas in jsdom), several Important.

- **Round 2** (2026-05-17): design.md updated:
  - Split unit tests by mock-vs-real-Canvas capability (closes TEST-1)
  - Added permissive `profilePhotos/` Storage rule as PR precondition (closes SEC-1)
  - Specified error type structure with `AvatarUploadError` base + `messageKey` (closes QUAL-1)
  - Added OffscreenCanvas scope-discipline note to D2 (closes QUAL-2)
  - Narrowed visual regression baseline to 3–4 surfaces (closes TEST-2)
  - Center-crop correctness via math unit test + optional real-Canvas integration (closes TEST-3)
  - Added `MockCommentRow` exclusion rationale to Non-Goals + Migration (closes INT-1)
  - Added URL-derivation contract comment task for `thumbnailUrl.ts` (closes ARCH-1)
  - Resolved loading copy: "변환 중…"

  All Critical and Important findings addressed.
