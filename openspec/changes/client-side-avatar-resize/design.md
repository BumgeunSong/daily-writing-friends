## Context

DailyWritingFriends renders user avatars across ~13 surfaces (comments, notifications, author lists, stats cards, profile pages). The exploration phase produced two findings that reshape this change:

1. **The Firebase Resize Images extension has never produced a resized variant in production** (verified via `gsutil ls` recursive search on the bucket — zero `_128x128` or `_600x338` outputs anywhere). The entire `useThumbnailUrl` swap pipeline is a silent no-op today; `ComposedAvatar` falls back to the original URL on every render.
2. **Profile uploads bypass the extension's filename-detection requirement** because `uploadUserProfilePhoto` writes to `profilePhotos/{uid}` with no file extension. Even after fixing the extension's bucket-name typo (`appspot.com` → `firebasestorage.app`), files would still likely be skipped.

For a 46-user community, server-side resize via the extension carries unjustified failure surface (IAM, billing, trigger binding, bucket config). Client-side Canvas resize at upload time eliminates the entire server pipeline.

Current code:
- `apps/web/src/user/api/user.ts:84-88` — `uploadUserProfilePhoto(uid, file)` calls `uploadBytes(ref('profilePhotos/' + uid), file)` and returns the download URL.
- `apps/web/src/user/components/EditAccountPage.tsx:175-179` — file input with `type='file' accept='image/*'`, `className='hidden'`, triggered by a button click.
- `apps/web/src/shared/ui/ComposedAvatar.tsx` — wraps Radix `Avatar`, currently uses `useThumbnailUrl` for Firebase URLs (no-op) and `=s{size}` param appending for Google avatars.
- `apps/web/src/shared/utils/thumbnailUrl.ts` and `apps/web/src/shared/hooks/useThumbnailUrl.ts` — async resize-URL resolution. Kept for post-image use cases.
- 12 avatar call sites render raw `<AvatarImage>` directly, bypassing `ComposedAvatar` entirely.

## Goals / Non-Goals

**Goals:**

- Every new profile-photo upload is resized to 256×256 JPEG in the browser before reaching Storage.
- iOS HEIC files from the user's photo album are auto-converted by the browser at picker time via the `accept` attribute.
- A visible loading state is present from the moment a user selects a file until the upload completes.
- All 12 avatar render call sites pass through `ComposedAvatar` for consistency and a single point of future optimization.
- No new infrastructure dependency (Cloud Functions, Supabase columns, schema migrations).
- Existing user avatars continue rendering without breakage (graceful degradation).

**Non-Goals:**

- Removing the Firebase Resize Images extension from `firebase.json` (separate cleanup).
- Post image (`postImages/`) optimization (out of scope; `useThumbnailUrl` retained for that use case).
- Migrating existing 46 avatar files (deferred — they self-heal on next user update).
- Multi-size avatars or responsive `<picture>` elements (single canonical 256×256).
- Service Worker / Cache Storage API for avatar bytes (HTTP cache is sufficient at this scale).
- Strict per-uid write enforcement on `profilePhotos/` (requires Firebase Auth integration — out of scope; this change formalizes the current Supabase-Auth-only posture).
- Migrating `MockCommentRow` to `ComposedAvatar` (it renders static fixture data for the login/onboarding flow, not user-uploaded avatars; the resize pipeline does not apply).

## Decisions

### D1. Output format and dimensions: 256×256 JPEG at quality 0.85

**Decision**: Canvas resize outputs a 256×256 square JPEG at quality 0.85.

**Why**:
- **256 vs 128**: largest avatar render in the codebase is `size-20` (80 px) which doubles to 160 px on retina; 256 covers comfortably with headroom for future larger displays.
- **JPEG vs WebP**: JPEG is preferred for two reasons. (a) Output format aligns with the `accept='image/jpeg,image/png'` HEIC auto-conversion path — Apple's documentation describes the conversion in JPEG terms. (b) Byte savings of WebP at this size (~5–10 KB difference) are negligible compared to the cost of touching the format-decision surface.
- **Quality 0.85**: Visually indistinguishable from 0.95 at avatar render sizes (≤80 px). 0.85 is the typical "publish quality" default in photo editors; we follow convention.
- **Square crop**: avatars are rendered in `rounded-full` circles; preserving non-square aspect ratios would only show extra pixels that get clipped anyway. Crop is center-anchored (the natural focal-point assumption for portraits).

**Alternatives rejected**:
- WebP: bytes saved are not worth deviating from JPEG-aligned HEIC-conversion contract.
- AVIF: too slow to encode in `canvas.toBlob` (no native browser support yet).
- Multiple sizes (128/256/512): no current display context demands it; complexity not justified.

### D2. The resize utility: `resizeImageBlob`

**Decision**: A pure function `resizeImageBlob(file: File, opts: { width: number; height: number; quality?: number; mimeType?: string })` returns `Promise<Blob>`.

**Algorithm**:
1. Decode the input via `createImageBitmap(file)` (universally supported in modern browsers; handles HEIC on iOS when accept-converted).
2. If `OffscreenCanvas` is available, draw onto an `OffscreenCanvas(256, 256)`, scaling and center-cropping (`drawImage(bitmap, sx, sy, sw, sh, 0, 0, 256, 256)`). Otherwise create an `HTMLCanvasElement` and do the same.
3. Export via `canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })` (OffscreenCanvas) or `canvas.toBlob(cb, 'image/jpeg', 0.85)` (HTMLCanvasElement, Promise-wrapped).
4. Call `bitmap.close()` to free memory.
5. **Scope discipline**: keep all Canvas/bitmap references inside the function body so they fall out of scope after blob export. `OffscreenCanvas` has no `close()` API; relying on GC means we must never cache it in module state or a React ref.

**Why this primary/fallback ordering**:
- `OffscreenCanvas` runs off the main thread (when used with a worker; even on main thread it's marginally faster), is well-supported (all modern desktop browsers + Android Chrome 69+, iOS Safari 16.4+).
- `HTMLCanvasElement` covers any environment where `OffscreenCanvas` is missing (older iOS WebViews, niche browsers).

**Error handling** (closes QUAL-1):

Error types live in `apps/web/src/shared/errors/avatarUpload.ts`:

```
class AvatarUploadError extends Error {
  messageKey: string;  // i18n key, e.g., 'error.avatar.unsupported'
}
class UnsupportedImageError extends AvatarUploadError {
  messageKey = 'error.avatar.unsupported';
}
class FileTooLargeError extends AvatarUploadError {
  messageKey = 'error.avatar.tooLarge';
}
```

- `createImageBitmap` failure (corrupt/unsupported file) → throw `UnsupportedImageError`.
- File size > 20 MB → reject before decoding with `FileTooLargeError`.
- Caller (EditAccountPage) maps `messageKey` to localized strings at the UI layer. Current Korean strings: `'JPEG 또는 PNG 형식의 사진을 사용해주세요'` and `'20MB 이하의 사진을 사용해주세요'`. Future English locale would only add a translation file; the utility itself stays language-agnostic.

### D3. File input contract: `accept='image/jpeg,image/png'`

**Decision**: `EditAccountPage`'s `<Input type='file' accept='image/jpeg,image/png' />`.

**Why**:
- iOS Safari auto-converts HEIC files to JPEG at picker time as long as HEIC is NOT in the accept list. JPEG and PNG suffice to receive that benefit while still allowing PNG screenshots/logos.
- Android Chrome ignores `accept` at the picker level (shows all files). Our Canvas decoder handles JPEG and PNG inputs identically — Canvas accepts any decodable image type and re-encodes to JPEG. Truly unsupported inputs (GIF, BMP, esoteric formats) fail at `createImageBitmap` with a friendly error.

### D4. Loading state: button + preview overlay during resize + upload

**Decision**: A single `isUploadingAvatar` state on `EditAccountPage` covers BOTH the in-browser resize and the Firebase upload as one continuous "processing" window.

**UX contract**:
- When the user selects a file (onChange), set `isUploadingAvatar = true`.
- The avatar preview area shows a spinner overlay (centered, 24 px, semi-transparent background) and the caption "변환 중…".
- The save button is disabled (already typical pattern in `EditAccountPage`).
- After `uploadUserProfilePhoto` resolves (success or error), set `isUploadingAvatar = false`.
- On error, surface the message in the existing form-error pattern (toast or inline alert depending on the page's existing convention — keep consistent).

### D5. `ComposedAvatar` becomes a thin wrapper

**Decision**: After Layer A migrates all call sites, `ComposedAvatar` no longer needs to call `useThumbnailUrl` for the avatar path. The component becomes:

```
ComposedAvatar({ src, alt, fallback, size, className }) →
  Avatar (size + style)
    AvatarImage src={src} alt={alt} loading="lazy" decoding="async"
    AvatarFallback ...
```

For Google OAuth avatars, the existing `appendGoogleAvatarSizeParam(src, size)` logic is preserved (Google avatars don't go through Canvas resize because they come pre-sized from the OAuth provider).

The `useThumbnailUrl` hook and `thumbnailUrl.ts` remain in the codebase for `postImages/` callers; the avatar render path no longer touches them.

### D6. Cache invalidation after upload

**Decision**: `uploadUserProfilePhoto` calls `removeCachedUserData(uid, cacheVersion)` on success so the new (smaller) URL is fetched on next render.

### D7. Optional header-only backfill for existing 46 files

**Decision**: NOT included as a script in this change. An operational one-liner (`gsutil setmeta -h "Cache-Control:public, max-age=2592000" gs://artico-app-4f9d4.firebasestorage.app/profilePhotos/*`) can be run anytime after merge if desired. Documented in the verify_report as a follow-up step.

### D8. Storage rule for `profilePhotos/` (closes SEC-1)

**Decision**: Add a permissive rule to `firebase/storage.rules` matching the existing `postImages/` pattern:

```
match /profilePhotos/{allPaths=**} {
  // No Firebase Auth required — app uses Supabase Auth (not Firebase Auth)
  allow read: if true;
  allow create, update: if true;
  allow delete: if true;
}
```

**Why permissive**: the app's primary auth is Supabase, not Firebase. Firebase Auth's `request.auth.uid` is always null in our requests, so the `isOwner()` helper in `storage.rules` (defined for `/users/{userId}/profile/...` paths) doesn't apply. Strict per-uid write enforcement would require either (a) integrating Firebase Auth alongside Supabase Auth, or (b) routing uploads through a signed-URL service. Both are out of scope.

This rule formalizes the existing state — uploads to `profilePhotos/` already succeed in production (we have 46 files), which means the deployed rules differ from what's in the repo, OR there's a bypass we haven't identified. Adding this rule ensures the repo matches reality and the new upload path is well-defined.

### D9. URL-derivation contract documentation (closes ARCH-1)

**Decision**: Add a header comment to `apps/web/src/shared/utils/thumbnailUrl.ts` documenting that `deriveThumbPath` encodes the Firebase Resize Images extension's `{base}_{width}x{height}.{ext}` naming convention. Any future server-side resize pipeline that emits URLs through this hook MUST produce filenames matching this pattern, or the function needs refactoring.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Canvas resize takes 300–600 ms on mid-range Android | Visible loading state (D4) covers the window |
| `createImageBitmap` fails for some niche format | Caught; friendly error message; user retries with JPEG/PNG |
| Android Chrome accepts unsupported file types via picker | Canvas decoder fails → friendly error path |
| JPEG re-encode artifacts on text/logo avatars | Documented; acceptable trade-off for photo-avatar primary use case |
| Existing 46 user avatars stay un-optimized | Acceptable (5-8 KB already); self-heals on user update |
| Drag-drop bypasses `accept` attribute | UI doesn't expose drag-drop; even if used, decode failure triggers clean error |
| `OffscreenCanvas` unsupported on user's browser | `HTMLCanvasElement` fallback |
| Future need for larger avatar (e.g., 512×512 profile hero) | Today's 256×256 covers up to retina-160 px; if a 512+ surface appears later, add a separate larger-size pipeline then |

## Migration Plan

This change ships as a single PR (no stacking — the scope is small).

1. **Precondition**: add `profilePhotos/` rule to `firebase/storage.rules` (D8) and deploy.
2. Add `resizeImageBlob` utility + tests (jsdom project + real-Canvas project).
3. Add error classes in `apps/web/src/shared/errors/avatarUpload.ts`.
4. Add `storageConstants.ts` with `AVATAR_CACHE_CONTROL`.
5. Update `uploadUserProfilePhoto` to use the utility + set cacheControl + invalidate cache.
6. Update `EditAccountPage`: `accept='image/jpeg,image/png'`, loading state with "변환 중…" copy.
7. Refactor 12 call sites to `ComposedAvatar`. Add an inline comment to `MockCommentRow` explaining the intentional non-migration (static fixture data, no resize pipeline).
8. Simplify `ComposedAvatar` (remove `useThumbnailUrl` from the avatar path).
9. Add header comment to `thumbnailUrl.ts` documenting URL-derivation contract (D9).
10. Capture visual regression baselines for 4 representative surfaces.
11. Run `image-perf.spec.ts` with hard assertions for measurement; record in `verify_report.md`.
12. Optional after merge: run `gsutil setmeta` one-liner for `Cache-Control` on existing 46 files.

**Rollback**: revert the client deploy. Existing originals remain at their paths; new uploads stop being resized but everything else works (avatars render correctly via `ComposedAvatar`'s graceful fallback to original `src`). The added Storage rule stays in place (no harm).

## Open Questions

- Exact JPEG quality default: 0.85 is the proposal; PR review may bump to 0.9 if visually warranted.
- Should we keep the Resize Images extension declaration in `firebase.json`? Out of scope for this change but worth a follow-up cleanup PR.
- Real-Canvas test environment choice: `@vitest/browser` (Chromium) vs `node-canvas` shim. Decided at implementation time based on CI infrastructure cost.

(Resolved: loading copy is "변환 중…"; `accept='image/jpeg,image/png'`; backfill is optional gsutil one-liner; tests split into two Vitest projects.)

## Testability Notes

Tests are split into **two Vitest projects** to accommodate the Canvas-in-jsdom limitation (closes TEST-1):

- **Default project (jsdom)** — tests that only require mock-friendly assertions (call args, error paths, branching logic).
- **Real-Canvas project** — tests that require actual image decoding/rendering. Implemented via a separate Vitest config that uses either `@vitest/browser` (Chromium) or the `canvas` npm package as a node-canvas shim, configured in `apps/web/vitest.canvas.config.ts`. Selection between the two TBD at implementation time based on CI cost vs. setup complexity.

### Unit (Layer 1) — Vitest (jsdom project)

- `resizeImageBlob` mock-friendly assertions:
  - Quality argument is propagated (assert via call args on a mocked `convertToBlob`/`toBlob`).
  - MIME type argument is propagated.
  - Rejects with `FileTooLargeError` for inputs > 20 MB (size check happens before `createImageBitmap`, so this is pure logic).
  - Rejects with `UnsupportedImageError` when `createImageBitmap` is mocked to throw.
  - `bitmap.close()` is called on success and on error (mocked spy).
  - Center-crop math: unit-test the `sx/sy/sw/sh` calculation as a pure helper for input dimensions (e.g., 1000×500 → sx=250, sy=0, sw=500, sh=500). This is pure arithmetic, no Canvas involved.
- Error classes:
  - `UnsupportedImageError` and `FileTooLargeError` both extend `AvatarUploadError`.
  - Both carry the correct `messageKey`.
- `uploadUserProfilePhoto`:
  - Calls `resizeImageBlob` once with the input file (mocked).
  - Calls `uploadBytes` with the resized blob (not the original file).
  - Passes `{ cacheControl: AVATAR_CACHE_CONTROL }`.
  - Calls `removeCachedUserData(uid, cacheVersion)` on success.
  - Propagates errors from the resize utility.
- `ComposedAvatar`:
  - Renders `<img src>` directly for any URL.
  - Appends `=s{size}` for Google avatar URLs.
  - Renders `AvatarFallback` when `src` is null/undefined/empty.
  - Does NOT invoke `useThumbnailUrl` (assert via mock not being called).

### Unit (Layer 1) — Real-Canvas project

- `resizeImageBlob` with actual image fixtures:
  - Input: synthetic 8×8 PNG fixture (committed under `tests/__fixtures__/avatar/`) with known colored quadrants.
  - Output dimensions are exactly 256×256 (read back via a fresh `createImageBitmap`).
  - Center-crop correctness: feed a 100×50 input fixture; verify the output's center pixel color matches the source's center area (closes TEST-3).
  - JPEG output verifies as a valid JPEG (magic bytes `FF D8 FF`).

### Integration (Layer 2) — Vitest

- `EditAccountPage` integration:
  - File selection triggers loading state immediately (`isUploadingAvatar=true`).
  - Loading state clears after upload promise resolves.
  - On upload error, the error message appears in the existing error surface.
  - Save button is disabled while `isUploadingAvatar` is true.

### E2E Network Passthrough (Layer 3) — agent-browser + image-perf.spec.ts

- Upload flow:
  - Open EditAccountPage, click upload, select a large (1+ MB) JPEG fixture.
  - Loading state appears within 50 ms.
  - Upload completes in < 5 s for a 5 MB input on a typical dev machine.
  - The avatar preview swaps to the new image.
  - Inspecting `users.profile_photo_url` post-upload and fetching the file: Content-Length is < 50 KB.
- Render flow:
  - Open a long comment thread with multiple avatars.
  - Every `<img>` for avatars uses `loading="lazy"`.
  - `image-perf.spec.ts` hard assertions:
    - `expect(oversizedAvatarCount).toBe(0)` after upload
    - `expect(perAvatarTransferKB).toBeLessThan(50)` for newly-uploaded avatars
- **Visual snapshot baseline (Playwright `toHaveScreenshot()`)** — narrowed scope (closes TEST-2): capture 4 representative surfaces only — (a) comment thread with avatars, (b) notification list, (c) user profile page, (d) avatar fallback state. Loading-state snapshots SKIPPED in favor of DOM assertions (`aria-busy='true'`, spinner element present). Baselines committed under `tests/__screenshots__/avatar-rendering/`. One viewport (mobile-typical, e.g., 390×844) — desktop view uses the same components and re-tests would duplicate coverage.

### E2E Local DB (Layer 4) — Supabase local Docker

- Sign in as a test user, upload a profile photo against local Supabase + the actual Firebase Storage emulator.
- Confirm `users.profile_photo_url` carries the new URL.
- Confirm the new image file's Cache-Control metadata is set correctly (read via `gsutil stat` against the emulator).
- **HEIC fallback test (clearly labeled)**: pass a HEIC `File` directly to the change handler — this bypasses the picker-level auto-conversion. Expected behavior: `createImageBitmap` fails on Chrome/Firefox, `UnsupportedImageError` is raised, user sees the friendly error message. This tests the FALLBACK path, NOT the happy-path HEIC conversion (which is a browser picker implementation detail that cannot be reproduced from JavaScript). The real HEIC happy-path requires manual verification on iOS Safari.
