## ADDED Requirements

### Requirement: Profile photo uploads are resized in the browser before upload

`uploadUserProfilePhoto` SHALL pass the input `File` through a Canvas-based resize utility (`resizeImageBlob`) before calling `uploadBytes`. The blob written to Firebase Storage MUST be a 256×256 JPEG produced by the utility, NOT the original input file.

#### Scenario: Large photo is resized before upload

- **WHEN** a user selects a 5 MB JPEG file for their profile photo
- **THEN** `uploadBytes` is called with a blob whose decoded dimensions are 256×256
- **AND** the blob's MIME type is `image/jpeg`
- **AND** the original 5 MB file is NEVER passed to `uploadBytes`

#### Scenario: Already-small photo still flows through resize

- **WHEN** a user selects a 50 KB JPEG file
- **THEN** the upload still passes through the resize utility (consistency of behavior; no conditional bypass)
- **AND** the output is 256×256 JPEG

### Requirement: File picker restricts acceptable formats to trigger iOS HEIC auto-conversion

The avatar file input on `EditAccountPage` SHALL declare `accept='image/jpeg,image/png'`. HEIC types MUST NOT appear in the `accept` attribute (so iOS Safari's picker performs automatic HEIC→JPEG conversion before delivering the `File` to JavaScript).

#### Scenario: iOS user selects HEIC photo from album

- **WHEN** an iOS Safari user opens the avatar file picker and selects a HEIC photo
- **THEN** iOS converts the file to JPEG at picker time
- **AND** the `change` event delivers a JPEG `File` to the page

#### Scenario: PNG screenshot is allowed

- **WHEN** a user selects a PNG screenshot
- **THEN** the file is accepted and flows through the resize pipeline (which normalizes to JPEG output)

### Requirement: Visible loading state during resize and upload

`EditAccountPage` SHALL display a visible loading indicator from the moment a file is selected until the upload promise resolves (success or error). The save/submit button MUST be disabled during this window.

#### Scenario: File selection triggers immediate loading state

- **WHEN** the user selects a file via the avatar picker
- **THEN** within 50 ms, a "변환 중…" (or equivalent) indicator appears in the avatar preview area
- **AND** the save button is disabled

#### Scenario: Loading state clears on success

- **WHEN** the upload completes successfully
- **THEN** the loading indicator is removed
- **AND** the avatar preview shows the newly-uploaded image
- **AND** the save button is re-enabled (subject to other validations)

#### Scenario: Loading state clears on error

- **WHEN** the resize or upload fails
- **THEN** the loading indicator is removed
- **AND** an error message localized for the failure type is shown
- **AND** the save button is re-enabled

### Requirement: Resize utility error contract

`resizeImageBlob` SHALL throw `FileTooLargeError` (extends `AvatarUploadError`) when the input file's size exceeds 20 MB, BEFORE attempting to decode. It SHALL throw `UnsupportedImageError` (extends `AvatarUploadError`) when `createImageBitmap` rejects (corrupt or unsupported image data). Both error classes carry an i18n-able `messageKey` property; raw user-facing strings live at the UI layer, not in the utility.

#### Scenario: Oversized file is rejected pre-decode

- **WHEN** `resizeImageBlob` is called with a 30 MB file
- **THEN** it rejects with `FileTooLargeError` BEFORE calling `createImageBitmap`
- **AND** the error carries `messageKey === 'error.avatar.tooLarge'`

#### Scenario: Undecodable file is rejected at decode

- **WHEN** `resizeImageBlob` is called with a malformed image
- **AND** `createImageBitmap` throws
- **THEN** it rejects with `UnsupportedImageError`
- **AND** the error carries `messageKey === 'error.avatar.unsupported'`

### Requirement: Profile photo uploads carry Cache-Control metadata

`uploadUserProfilePhoto` SHALL pass `{ cacheControl: AVATAR_CACHE_CONTROL }` to `uploadBytes`, where `AVATAR_CACHE_CONTROL = 'public, max-age=2592000'` (30 days) is exported from a shared constants module.

#### Scenario: New upload carries Cache-Control header

- **WHEN** a user uploads a new profile photo
- **THEN** the resulting Storage object's `cacheControl` metadata equals `'public, max-age=2592000'`

### Requirement: Profile photo upload invalidates uploader's local cache

`uploadUserProfilePhoto` SHALL call `removeCachedUserData(uid, cacheVersion)` after a successful upload so that the uploader's next `useUser` call refetches from Supabase.

#### Scenario: Successful upload invalidates user cache

- **WHEN** `uploadUserProfilePhoto(uid, file)` resolves successfully
- **THEN** `localStorage` no longer contains the cached User entry for that uid

#### Scenario: Failed upload leaves cache untouched

- **WHEN** `uploadUserProfilePhoto(uid, file)` rejects
- **THEN** the cached User entry for that uid is unchanged

### Requirement: All avatar surfaces render through ComposedAvatar

Every production surface that renders a user profile photo SHALL use `ComposedAvatar`. Raw `<AvatarImage>` from Radix MUST NOT appear in feature code outside of `ComposedAvatar`'s own implementation file, except in `MockCommentRow` (a skeleton/test scaffold that renders static fixture data with no resize-pipeline applicability, explicitly exempted with an inline comment).

#### Scenario: Comment thread uses ComposedAvatar

- **WHEN** a user opens a post detail page with comments
- **THEN** every comment author avatar is rendered by `ComposedAvatar`
- **AND** no comment surface imports `AvatarImage` directly

#### Scenario: New code path goes through ComposedAvatar

- **WHEN** a developer adds a new component rendering a user avatar
- **THEN** code review rejects raw `<AvatarImage>` usage outside `ComposedAvatar.tsx` and the exempted `MockCommentRow.tsx`

### Requirement: ComposedAvatar renders synchronously without async URL resolution

`ComposedAvatar` SHALL render the provided `src` directly without invoking any async URL resolution helper (e.g., `useThumbnailUrl`) for the avatar render path. The Google avatar size-hint logic (`appendGoogleAvatarSizeParam`) MAY remain for `googleusercontent.com` URLs.

#### Scenario: Firebase Storage URL renders directly

- **WHEN** `ComposedAvatar` receives a Firebase Storage URL
- **THEN** the rendered `<img>` `src` equals that URL exactly (no swap, no async resolution)
- **AND** `useThumbnailUrl` is NOT invoked

#### Scenario: Google avatar URL gets size hint

- **WHEN** `ComposedAvatar` receives a `https://lh3.googleusercontent.com/...` URL
- **THEN** the rendered `<img>` `src` equals the URL with `=s{size}` appended once

### Requirement: Storage rules permit writes to profilePhotos

`firebase/storage.rules` SHALL include a `match /profilePhotos/{allPaths=**}` block that allows read and write operations consistent with the existing `postImages/` rule. This formalizes the current permissive posture (the app authenticates via Supabase, not Firebase Auth, so Firebase Auth-based ownership enforcement is not feasible without separate work).

#### Scenario: Authenticated upload succeeds

- **WHEN** a logged-in user uploads to `profilePhotos/{their-uid}`
- **THEN** the upload is permitted by Storage rules

#### Scenario: Anyone can read a profile photo

- **WHEN** any client requests a download URL for a `profilePhotos/` object
- **THEN** the request is permitted by Storage rules

### Requirement: useThumbnailUrl is retained for post images only

The `useThumbnailUrl` hook and `thumbnailUrl.ts` SHALL remain in the codebase for post-image use cases (`PostCardThumbnail`, `PostCardContent`). A header comment in `thumbnailUrl.ts` SHALL document the URL-derivation contract (`{base}_{width}x{height}.{ext}` naming) so any future server-side resize pipeline knows what URL scheme to produce.

#### Scenario: Post image components continue to use useThumbnailUrl

- **WHEN** a post card renders its thumbnail
- **THEN** it invokes `useThumbnailUrl` to derive the resized URL (today's behavior, unchanged)

#### Scenario: Documentation is present

- **WHEN** a developer reads `thumbnailUrl.ts`
- **THEN** a header comment explicitly states the URL-derivation naming convention and notes that the avatar path no longer uses this hook
