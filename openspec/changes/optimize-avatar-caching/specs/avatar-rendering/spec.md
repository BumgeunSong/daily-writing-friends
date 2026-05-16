## ADDED Requirements

### Requirement: Unified avatar render path

All production surfaces that render a user profile photo SHALL render it through the shared `ComposedAvatar` component. Raw `<AvatarImage>` (the Radix primitive) MUST NOT appear in feature code outside of `ComposedAvatar`'s own implementation, except in `MockCommentRow` (a skeleton/test scaffold explicitly exempted).

#### Scenario: Comment thread renders avatars through ComposedAvatar

- **WHEN** a user opens a post detail page with comments
- **THEN** every comment author avatar is rendered by `ComposedAvatar`
- **AND** no comment surface uses `<AvatarImage>` directly from `@/shared/ui/avatar`

#### Scenario: New avatar surface added in future code

- **WHEN** a developer adds a new component that renders a user avatar
- **THEN** that component imports and uses `ComposedAvatar`
- **AND** code review rejects raw `<AvatarImage>` usage outside `ComposedAvatar.tsx` and `MockCommentRow.tsx`

### Requirement: ComposedAvatar prefers a pre-resolved thumbnail URL

`ComposedAvatar` SHALL accept an optional `thumbSrc` prop. When `thumbSrc` is a non-empty string, the component SHALL render it directly without invoking any async resolution (`useThumbnailUrl`, `getDownloadURL`). When `thumbSrc` is null, undefined, or empty, the component SHALL fall back to the existing resolution path for Firebase Storage URLs or the `=s{size}` appending for Google avatar URLs.

#### Scenario: thumbSrc provided

- **WHEN** `ComposedAvatar` is rendered with `src="https://firebasestorage.googleapis.com/...original.jpg"` and `thumbSrc="https://firebasestorage.googleapis.com/..._128x128.jpg"`
- **THEN** the rendered `<img>` `src` attribute equals the `thumbSrc` value
- **AND** no `getDownloadURL` call is issued

#### Scenario: thumbSrc absent, Firebase original

- **WHEN** `ComposedAvatar` is rendered with `src="https://firebasestorage.googleapis.com/...original.jpg"` and no `thumbSrc`
- **THEN** the component invokes `useThumbnailUrl` to resolve the resized variant
- **AND** the rendered `src` initially shows the original URL, then swaps to the resized variant once resolved

#### Scenario: thumbSrc absent, Google avatar

- **WHEN** `ComposedAvatar` is rendered with `src="https://lh3.googleusercontent.com/abc"` and no `thumbSrc`
- **THEN** the rendered `<img>` `src` equals `https://lh3.googleusercontent.com/abc=s{size}` where `{size}` matches the component's `size` prop

#### Scenario: both src and thumbSrc absent

- **WHEN** `ComposedAvatar` is rendered with both `src` and `thumbSrc` null/undefined
- **THEN** the component renders the `AvatarFallback` (initials or icon) and issues no image request

### Requirement: User model carries an optional pre-resolved thumbnail URL

The `User` model SHALL expose an optional `profilePhotoThumbURL: string | null` field. The field MUST belong to `UserOptionalFields` (not `UserRequiredFields`) so that pre-migration cached User records lacking the field continue to validate.

#### Scenario: Read path returns thumb URL when populated

- **WHEN** `fetchUserFromSupabase(uid)` is called for a user whose `users.profile_photo_thumb_url` is non-null
- **THEN** the returned `User` has `profilePhotoThumbURL` equal to that value

#### Scenario: Read path returns null thumb URL when column is null

- **WHEN** `fetchUserFromSupabase(uid)` is called for a user whose `users.profile_photo_thumb_url` is null
- **THEN** the returned `User` has `profilePhotoThumbURL = null`

#### Scenario: Cached pre-migration entry validates

- **WHEN** `isValidUserData` is called on a cached User object that lacks the `profilePhotoThumbURL` field
- **THEN** the function returns `true`

### Requirement: Notification mapper prefers thumb URL with original as fallback

`notificationReads.ts` SHALL select both `profile_photo_url` and `profile_photo_thumb_url` for actor users. The mapper SHALL set `notification.fromUserProfileImage = thumb_url ?? original_url`. The field name and contract remain unchanged — callers continue to see "a usable profile image URL".

#### Scenario: Actor has both URLs

- **WHEN** a notification's actor user has both `profile_photo_url` and `profile_photo_thumb_url` set
- **THEN** `notification.fromUserProfileImage` equals the thumb URL

#### Scenario: Actor has only original URL

- **WHEN** a notification's actor user has `profile_photo_url` set but `profile_photo_thumb_url` is null
- **THEN** `notification.fromUserProfileImage` equals the original URL

#### Scenario: Actor has neither

- **WHEN** a notification's actor user has both URLs null
- **THEN** `notification.fromUserProfileImage` is `undefined`

### Requirement: Profile photo uploads set Cache-Control metadata

`uploadUserProfilePhoto` SHALL pass `cacheControl: 'public, max-age=2592000'` (sourced from a shared `AVATAR_CACHE_CONTROL` constant) when calling `uploadBytes`. The original file uploaded under `profilePhotos/{uid}` MUST carry this header.

#### Scenario: New upload carries Cache-Control

- **WHEN** a user uploads a new profile photo
- **THEN** the resulting Storage object's `cacheControl` metadata equals `'public, max-age=2592000'`

### Requirement: Profile photo uploads invalidate the uploader's local cache

`uploadUserProfilePhoto` SHALL call `removeCachedUserData(uid, cacheVersion)` after a successful upload so that the next `useUser` call refetches from Supabase.

#### Scenario: Successful upload invalidates cache

- **WHEN** `uploadUserProfilePhoto(uid, file)` resolves successfully
- **THEN** `localStorage` no longer contains the cached User entry for that uid

#### Scenario: Failed upload does not invalidate cache

- **WHEN** `uploadUserProfilePhoto(uid, file)` rejects
- **THEN** the cached User entry for that uid is unchanged

### Requirement: Storage rules enforce ownership on profilePhotos

Firebase Storage rules SHALL match `profilePhotos/{userId}/{allPaths=**}` and allow writes only when `request.auth.uid == userId`. Reads SHALL be allowed for any authenticated context (so other clients can render the avatar).

#### Scenario: Owner can write

- **WHEN** an authenticated user with `auth.uid == "user-A"` uploads to `profilePhotos/user-A/avatar.jpg`
- **THEN** the upload succeeds

#### Scenario: Non-owner cannot write

- **WHEN** an authenticated user with `auth.uid == "user-A"` attempts to upload to `profilePhotos/user-B/avatar.jpg`
- **THEN** the upload is denied with permission-error

#### Scenario: Anyone authenticated can read

- **WHEN** any authenticated user requests a download URL for `profilePhotos/user-X/_128x128.jpg`
- **THEN** the request succeeds

### Requirement: Cloud Function reactively populates thumb URL and sets Cache-Control on resized objects

A Firebase Cloud Function SHALL listen to `object.finalize` events on Storage objects matching `profilePhotos/**/*_128x128.*`. When triggered, the Function SHALL:
1. Extract the uid from the path using a strict regex (`^profilePhotos\/([^/]+).*_128x128\.[^.]+$`).
2. Validate that the extracted string is a well-formed user identifier and that a matching `users` row exists.
3. Set `cacheControl: 'public, max-age=2592000'` metadata on the resized Storage object.
4. Execute a scoped `UPDATE users SET profile_photo_thumb_url = $1 WHERE id = $2` using the Supabase service-role key from Firebase Secret Manager.

#### Scenario: Resize finalize triggers Function

- **WHEN** the Resize Images extension writes `profilePhotos/user-X/avatar_128x128.jpg`
- **THEN** the Function fires
- **AND** `users.profile_photo_thumb_url` for `user-X` is updated to the download URL of the resized object
- **AND** the resized Storage object's `cacheControl` metadata equals `'public, max-age=2592000'`

#### Scenario: Function fails uid validation

- **WHEN** a path that does not match the uid regex finalizes
- **THEN** the Function returns without writing to Supabase

#### Scenario: Function fails uid existence check

- **WHEN** the extracted uid does not exist in `users`
- **THEN** the Function logs a warning and does not perform an UPDATE

#### Scenario: Function only updates a single column

- **WHEN** the Function performs its UPDATE statement
- **THEN** only `profile_photo_thumb_url` is in the SET clause; no other columns are written

### Requirement: Scheduled self-healing populates missed thumb URLs

A scheduled Cloud Function SHALL run weekly. It SHALL SELECT users where `profile_photo_url IS NOT NULL AND profile_photo_thumb_url IS NULL` (bounded by a LIMIT), derive the expected `_128x128` URL, and UPDATE the row. The Function MUST be idempotent and bounded in batch size.

#### Scenario: Scheduled run repairs a missed row

- **WHEN** a user's `profile_photo_url` is set but `profile_photo_thumb_url` is null (because the Function failed)
- **AND** the scheduled self-healing Function runs
- **AND** the resized variant exists in Storage
- **THEN** the user's `profile_photo_thumb_url` is populated within that run

#### Scenario: Scheduled run is bounded

- **WHEN** the scheduled Function runs
- **THEN** it processes at most a configured batch size (e.g., 500 rows) per run

### Requirement: Cross-device staleness is bounded by the user-row cache TTL

After a user re-uploads a profile photo, other clients SHALL render the new avatar within at most the `userCache.ts` TTL (24 hours) without explicit invalidation. This is achieved by: (a) re-upload triggers the Function, (b) Function updates `profile_photo_thumb_url`, (c) other clients refetch the User row after their local 24 h cache expires, (d) new URL → new HTTP cache entry → fresh bytes.

#### Scenario: Re-upload propagates within TTL window

- **WHEN** user A re-uploads their avatar
- **AND** the Cloud Function completes successfully
- **AND** 24 hours have passed for user B
- **AND** user B opens a page that renders user A's avatar
- **THEN** user B sees the new avatar bytes

### Requirement: Backfill scripts are idempotent and gated for production

Each backfill script (`scripts/backfill-profile-thumb-urls.ts`, `scripts/backfill-storage-cache-control.ts`) SHALL default to dry-run. A `--prod` flag MUST be required to perform writes. When `--prod` is supplied, the script MUST print the count of affected rows/files and prompt for `[y/N]` confirmation before proceeding. A second run against an already-backfilled set MUST produce zero writes.

#### Scenario: Default invocation is dry-run

- **WHEN** the script is invoked without `--prod`
- **THEN** no writes occur and the script reports what would be written

#### Scenario: Production run requires confirmation

- **WHEN** the script is invoked with `--prod`
- **THEN** the script prints the count of rows/files to be affected and prompts the operator to confirm
- **AND** declining the prompt aborts without writes

#### Scenario: Second run is a no-op

- **WHEN** the script is run twice in sequence with `--prod`
- **THEN** the second run reports zero affected rows/files and performs zero writes

### Requirement: image-perf.spec.ts enforces hard regression gates per layer

`tests/image-perf.spec.ts` SHALL include hard `expect` assertions (not just logged metrics) tuned to per-PR baselines. The assertions MUST distinguish avatar `<img>` elements from post-image `<img>` elements before evaluating thresholds.

#### Scenario: PR1 assertions

- **WHEN** the spec runs after Layer A merges
- **THEN** `expect(oversizedAvatarCount).toBe(0)` passes
- **AND** `expect(allAvatars.every(hasLazyLoading)).toBe(true)` passes

#### Scenario: PR2 assertions

- **WHEN** the spec runs after Layer C merges
- **THEN** `expect(perAvatarNetworkRequestCount).toBe(1)` passes for users whose `profile_photo_thumb_url` is non-null
- **AND** `expect(maxAvatarColdTransferKB).toBeLessThan(threshold)` passes

#### Scenario: PR3 assertions

- **WHEN** the spec runs after Layer B merges with a warm browser cache
- **THEN** `expect(warmCacheAvatarTransferKB).toBeLessThan(1)` passes
- **AND** `expect(avatarsCarryCacheControlHeader).toBe(true)` passes

### Requirement: EditAccountPage provides instant local preview during upload

`EditAccountPage` SHALL render a local object URL preview the moment a user selects an image file, before the upload completes. The object URL MUST be revoked on component unmount or when a new file is selected, via a dedicated `useObjectURL` hook (or equivalent `useEffect` cleanup).

#### Scenario: File selected shows immediate preview

- **WHEN** the user selects an image file in the avatar field
- **THEN** the avatar preview shows the file via `URL.createObjectURL`
- **AND** the upload begins in the background

#### Scenario: Object URL revoked on unmount

- **WHEN** the user navigates away from EditAccountPage before unmount
- **THEN** `URL.revokeObjectURL` is called with the previously created object URL

#### Scenario: Object URL revoked on new selection

- **WHEN** the user selects a second image file replacing the first
- **THEN** `URL.revokeObjectURL` is called with the first object URL before the second is created
