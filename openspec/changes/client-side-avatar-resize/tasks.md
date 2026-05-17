## 1. Preflight & Baselines

- [ ] 1.1 Run `npx playwright test tests/image-perf.spec.ts --project=chromium` against an authenticated dev session on a board feed + long comment thread; archive the baseline JSON report under `verify_report/`
- [ ] 1.2 Identify the threshold for per-avatar transferKB based on baseline (recorded in `verify_report.md`)

## 2. Storage Rules (precondition)

- [x] 2.1 Add `match /profilePhotos/{allPaths=**}` block to `firebase/storage.rules` mirroring the existing `postImages/` pattern (`allow read: if true; allow create, update: if true; allow delete: if true;`)
- [ ] 2.2 Deploy Storage rules; manually verify in the emulator that an upload to `profilePhotos/test-uid` succeeds

## 3. Shared error types

- [x] 3.1 Create `apps/web/src/shared/errors/avatarUpload.ts` with `AvatarUploadError` (abstract base) + `UnsupportedImageError` + `FileTooLargeError` carrying `messageKey` properties
- [x] 3.2 Wire the two `messageKey`s into the app's existing i18n / localization pattern (or, if none exists, store Korean strings in a small map at the UI layer)

## 4. Resize utility

- [x] 4.1 Create `apps/web/src/shared/utils/resizeImageBlob.ts` exporting `resizeImageBlob(file: File, opts: { width: number; height: number; quality?: number; mimeType?: string }): Promise<Blob>`
- [x] 4.2 Implement size pre-check (>20 MB → `FileTooLargeError`) BEFORE calling `createImageBitmap`
- [x] 4.3 Implement decode with `createImageBitmap`; catch failures and throw `UnsupportedImageError`
- [x] 4.4 Implement center-crop math as a pure helper (`computeCenterCrop(srcW, srcH, dstW, dstH) → { sx, sy, sw, sh }`)
- [x] 4.5 Implement `OffscreenCanvas` primary path; `HTMLCanvasElement` fallback (Promise-wrapped `toBlob`)
- [x] 4.6 Call `bitmap.close()` in both success and error paths; keep canvas references inside the function (scope discipline)

## 5. Storage constants

- [x] 5.1 Create `apps/web/src/shared/utils/storageConstants.ts` exporting `AVATAR_CACHE_CONTROL = 'public, max-age=2592000'`

## 6. Upload orchestration

- [x] 6.1 Update `apps/web/src/user/api/user.ts → uploadUserProfilePhoto(uid, file)`:
  - call `resizeImageBlob(file, { width: 256, height: 256, quality: 0.85, mimeType: 'image/jpeg' })`
  - call `uploadBytes(storageRef, blob, { contentType: 'image/jpeg', cacheControl: AVATAR_CACHE_CONTROL })`
  - on success: call `removeCachedUserData(uid, cacheVersion)`
- [x] 6.2 Update return type if changed; preserve the existing `Promise<string>` (download URL) contract

## 7. EditAccountPage

- [x] 7.1 Update the file `<Input>` at line 177: `accept='image/*'` → `accept='image/jpeg,image/png'`
- [x] 7.2 Add `isUploadingAvatar` state; set to `true` immediately on file select; set to `false` on upload resolve/reject
- [x] 7.3 Add a spinner overlay with caption "변환 중…" in the avatar preview area, visible when `isUploadingAvatar === true`
- [x] 7.4 Add `aria-busy={isUploadingAvatar}` on the relevant container for assistive tech
- [x] 7.5 Disable the save button while `isUploadingAvatar === true`
- [x] 7.6 Surface `AvatarUploadError`s via the page's existing error UI; map `messageKey` to Korean strings:
  - `error.avatar.tooLarge` → "20MB 이하의 사진을 사용해주세요"
  - `error.avatar.unsupported` → "JPEG 또는 PNG 형식의 사진을 사용해주세요"

## 8. ComposedAvatar simplification

- [x] 8.1 Remove `useThumbnailUrl` call from `apps/web/src/shared/ui/ComposedAvatar.tsx`
- [x] 8.2 Render `src` directly for Firebase Storage URLs; keep `appendGoogleAvatarSizeParam` for Google avatar URLs
- [x] 8.3 Verify `useThumbnailUrl` and `thumbnailUrl.ts` are no longer imported anywhere in the avatar render path

## 9. URL-derivation contract documentation

- [x] 9.1 Add a header comment to `apps/web/src/shared/utils/thumbnailUrl.ts` documenting the `{base}_{width}x{height}.{ext}` naming convention, noting that the avatar path no longer uses this helper, and that any future server-side resize pipeline must produce URLs matching this scheme

## 10. Layer A — Migrate 12 avatar call sites to ComposedAvatar

- [x] 10.1 `apps/web/src/comment/components/CommentHeader.tsx`
- [x] 10.2 `apps/web/src/board/components/AuthorList.tsx`
- [x] 10.3 `apps/web/src/notification/components/NotificationItem.tsx`
- [x] 10.4 `apps/web/src/login/components/ActiveUserProfileList.tsx`
- [x] 10.5 `apps/web/src/comment/components/ReactionUserDrawer.tsx`
- [x] 10.6 `apps/web/src/comment/components/ReactionUserTooltip.tsx`
- [x] 10.7 `apps/web/src/user/components/BlockedUsersPage.tsx` (×2 call sites at lines 78 and 326)
- [x] 10.8 `apps/web/src/stats/components/UserPostingStatsCard.tsx`
- [x] 10.9 `apps/web/src/stats/components/UserCommentStatsCard.tsx`
- [x] 10.10 `apps/web/src/user/components/UserProfile.tsx`
- [x] 10.11 `apps/web/src/user/components/EditAccountPage.tsx`
- [x] 10.12 Add inline comment to `apps/web/src/shared/components/MockCommentRow.tsx` explaining intentional non-migration (static fixture data; resize pipeline does not apply)

## 11. Visual regression baselines

- [ ] 11.1 Add Playwright spec capturing `toHaveScreenshot()` baselines for 4 representative surfaces: comment thread, notification list, user profile page, avatar fallback state
- [ ] 11.2 Commit baselines under `tests/__screenshots__/avatar-rendering/`
- [ ] 11.3 Single viewport only (mobile-typical, e.g., 390×844)

## 12. image-perf.spec.ts hard assertions

- [ ] 12.1 Add avatar-vs-post classification helper to the spec (sample by alt text matching `/profile|avatar|user/i` or DOM ancestor `.avatar`)
- [ ] 12.2 Add hard `expect` assertions:
  - `expect(oversizedAvatarCount).toBe(0)` for newly-uploaded avatars
  - `expect(perAvatarTransferKB).toBeLessThan(50)` for newly-uploaded avatars
  - `expect(allAvatarsHaveLazyLoading).toBe(true)`
- [ ] 12.3 Run the spec; record results in `verify_report.md`

## 13. Post-merge operational (optional)

- [ ] 13.1 Run `gsutil setmeta -h "Cache-Control:public, max-age=2592000" gs://artico-app-4f9d4.firebasestorage.app/profilePhotos/*` to backfill Cache-Control on existing 46 files
- [ ] 13.2 Record results in `verify_report.md`

## 14. Archive superseded change

- [x] 14.1 Mark the committed `optimize-avatar-caching` change as superseded (do not delete commits — preserve review history). Update its proposal.md with a top-of-file note: "SUPERSEDED by client-side-avatar-resize; not implemented. See that change for the actual avatar optimization strategy."

## Tests

### Unit (Vitest — jsdom project)

Per the project's testing skill (`/testing`), only pure functions are unit-tested
(output-based). Mock-heavy assertions against hooks, components, or imperative-shell
side effects are deferred to E2E coverage (T.20–T.25). Tests below marked [E2E] are
not implemented as unit tests by design.

- [x] T.1 `AvatarUploadError`, `UnsupportedImageError`, `FileTooLargeError` carry the right `messageKey` and class inheritance
- [E2E] T.2 `resizeImageBlob` rejects with `FileTooLargeError` for inputs > 20 MB (no `createImageBitmap` call made)
- [E2E] T.3 `resizeImageBlob` rejects with `UnsupportedImageError` when `createImageBitmap` is mocked to throw
- [E2E] T.4 `resizeImageBlob` calls `convertToBlob` / `toBlob` with the requested quality and MIME type (mock spy)
- [E2E] T.5 `resizeImageBlob` calls `bitmap.close()` on success and on error
- [x] T.6 `computeCenterCrop` pure helper: for 1000×500 → 256×256 input, returns `{ sx: 250, sy: 0, sw: 500, sh: 500 }`; verify several aspect ratios
- [E2E] T.7 `uploadUserProfilePhoto` calls `resizeImageBlob` then `uploadBytes` with the resized blob (mock)
- [E2E] T.8 `uploadUserProfilePhoto` passes `cacheControl: AVATAR_CACHE_CONTROL` to `uploadBytes`
- [E2E] T.9 `uploadUserProfilePhoto` calls `removeCachedUserData(uid, cacheVersion)` on success; not on failure
- [E2E] T.10 `ComposedAvatar` does NOT invoke `useThumbnailUrl` (mock spy)
- [E2E] T.11 `ComposedAvatar` renders raw `src` directly for Firebase Storage URLs
- [E2E] T.12 `ComposedAvatar` appends `=s{size}` once for Google avatar URLs

### Unit (Vitest — real-Canvas project)

- [ ] T.13 Set up `vitest.canvas.config.ts` with either `@vitest/browser` Chromium or `canvas` (node-canvas) shim; document which was chosen
- [ ] T.14 `resizeImageBlob` with an 8×8 synthetic PNG fixture: output is a valid JPEG (magic bytes `FF D8 FF`)
- [ ] T.15 `resizeImageBlob` output decodes to exactly 256×256 dimensions
- [ ] T.16 `resizeImageBlob` center-crop correctness: feed a 100×50 fixture with colored quadrants; verify the output's center pixel matches the source's center area

### Integration (Vitest — jsdom)

- [ ] T.17 `EditAccountPage` integration: file selection triggers `isUploadingAvatar=true` immediately
- [ ] T.18 `EditAccountPage` integration: error path surfaces the right localized message
- [ ] T.19 `EditAccountPage` integration: save button is disabled while `isUploadingAvatar` is true

### E2E (agent-browser / Playwright)

- [ ] T.20 Upload flow E2E: select 1+ MB JPEG fixture → loading state within 50 ms → upload completes < 5 s → avatar preview updates
- [ ] T.21 Render flow E2E: open long comment thread → every avatar `<img>` has `loading="lazy"` → per-avatar `transferKB` < 50
- [ ] T.22 Visual regression: `toHaveScreenshot()` matches committed baselines for 4 representative surfaces
- [ ] T.23 HEIC fallback test (clearly labeled): pass a HEIC `File` directly to the change handler in a Chromium test → `UnsupportedImageError` raised → error message visible. (Note: this tests the FALLBACK, not the iOS picker-level auto-conversion which requires manual Safari verification.)

### E2E Local DB (Supabase local Docker)

- [ ] T.24 Upload through the app against local Supabase: `users.profile_photo_url` carries the new URL
- [ ] T.25 The uploaded file's `cacheControl` metadata equals `'public, max-age=2592000'` (verify via `gsutil stat` or admin SDK probe)

### Manual

- [ ] T.26 iOS Safari real-device test: pick a HEIC photo from the album via the picker; confirm it uploads successfully (the browser converts it to JPEG at picker level)
