## Why

User profile photos (avatars) are rendered on nearly every social surface in the app — every comment, notification, author list, stats card. Today they ship inefficiently along two independent axes:

1. **The Firebase Resize Images extension has never produced a single resized variant in production.** Direct `gsutil` inspection: 46 files under `profilePhotos/`, **zero** `_128x128` variants; the entire bucket also has zero `_600x338` variants. Probable causes (any of: bucket-name typo, never-installed, IAM, billing) compound — the entire server-side resize pipeline has been a no-op for the app's history.
2. **12 of ~13 avatar call sites bypass the optimized renderer** (`ComposedAvatar`) and render raw `<AvatarImage>` with the original Storage URL. The one site that does use `ComposedAvatar` (`PostUserProfile`) calls `useThumbnailUrl`, which fails silently because the resized variant doesn't exist, then falls back to the original URL.

Net effect: every avatar render in the entire app ships the original full file. The original `optimize-avatar-caching` change was designed to optimize cache delivery of resized variants — but the variants don't exist to be cached.

### Why client-side resize over fixing the extension

The earlier exploration considered three resize approaches:

- **Server-side resize (current proposal `optimize-avatar-caching` and the Firebase Resize Images extension)**: depends on extension being correctly installed, correct IAM, correct bucket binding, correct trigger configuration. None of these can be confirmed without operational access. For a 46-user app, the failure surface is unjustified.
- **Minimal extension fix (`IMAGE_TYPE=jpeg`, no backfill)**: smallest change if the extension is actually live, but stakes a fix on an unverified assumption.
- **Client-side Canvas resize before upload**: a ~20-line client utility resizes images in the browser before `uploadBytes`. Eliminates the extension entirely. Zero infra dependencies, no IAM, no billing, no backfill, no deploy ordering. Pairs with `accept="image/jpeg"` on the file input — iOS Safari then auto-converts HEIC photos from the album to JPEG at picker time, removing the only realistic HEIC concern with zero library dependencies.

For a 46-user writing community, client-side resize is the correct scale of solution.

## What Changes

### 1. Client-side Canvas resize at upload time

- New utility `apps/web/src/shared/utils/resizeImageBlob.ts`: takes a `File`, draws onto an `OffscreenCanvas` (or `HTMLCanvasElement` fallback) at target dimensions, returns a JPEG `Blob` via `canvas.convertToBlob` / `canvas.toBlob`.
- Default output: 256×256 JPEG (retina-safe for 128-px display) at quality 0.85.
- Used by `uploadUserProfilePhoto` in `apps/web/src/user/api/user.ts` — the resized blob is what gets uploaded; the original `File` is never sent over the network.

### 2. Restrict file picker to non-HEIC formats to trigger iOS auto-conversion

- `apps/web/src/user/components/EditAccountPage.tsx` line 177: `accept='image/*'` → `accept='image/jpeg,image/png'`.
- iOS Safari documented behavior: when `accept` does not include HEIC types, photos selected from the album are automatically converted to JPEG before being delivered to JavaScript. JPEG and PNG in the accept list both preserve this guarantee (HEIC is still excluded). PNG support is included so users with screenshot or logo avatars can still upload them — Canvas normalizes to JPEG output regardless of input format.
- Android Chrome's file picker does not strictly enforce `accept`; the user may still select unsupported formats (GIF, BMP, etc.). The Canvas pipeline catches this with a clean error and surfaces a friendly message ("JPEG 또는 PNG 형식의 사진을 사용해주세요"). Pre-check file size before decoding (reject files larger than 20 MB to fail fast on truly malformed input).
- Drag-and-drop is not exposed in EditAccountPage's UI (`Input` is `className='hidden'`, triggered by a button click), so the picker is the only realistic entry point.

### 2b. Visible loading state during the resize step

- Canvas decode + resize for a multi-MB photo can take 300–600 ms on a mid-range Android device. Without UI feedback, this looks like a frozen button.
- The file-selection handler immediately sets a "processing" state on EditAccountPage:
  - Avatar preview area shows a spinner overlay or a "변환 중…" caption
  - The save/upload button is disabled
  - State clears when the upload promise resolves (success or error)
- The loading state covers BOTH the resize step AND the Storage upload — users see one continuous "in progress" indicator from picker close to upload completion.

### 3. Set `Cache-Control` on uploads

- `uploadUserProfilePhoto` passes `{ cacheControl: 'public, max-age=2592000' }` (30 days) to `uploadBytes`. Stored in a shared constant `AVATAR_CACHE_CONTROL` in `apps/web/src/shared/utils/storageConstants.ts`.
- **Optional header-only backfill** (no re-encode): a small `gsutil setmeta -h "Cache-Control:public, max-age=2592000" gs://artico-app-4f9d4.firebasestorage.app/profilePhotos/*` operational step adds the header to the existing 46 files without re-uploading them. Not a blocker; can run anytime after merge.

### 4. Layer A — Unify avatar rendering through `ComposedAvatar`

- Refactor 12 avatar call sites to use `ComposedAvatar` instead of raw `<AvatarImage>`: `CommentHeader`, `AuthorList`, `NotificationItem`, `ActiveUserProfileList`, `ReactionUserDrawer`, `ReactionUserTooltip`, `BlockedUsersPage` (×2), `UserPostingStatsCard`, `UserCommentStatsCard`, `UserProfile`, `EditAccountPage`.
- Skip `MockCommentRow` (skeleton/test scaffold).
- Each call site passes `src`, `size`, `alt`, `fallback`. No `thumbSrc` prop (it becomes unnecessary because the uploaded blob IS already the right size — Firebase URL points to a 256×256 JPEG, not a 5 MB original).
- Simplify `ComposedAvatar`: remove `useThumbnailUrl` resolution path entirely from the avatar code path (`useThumbnailUrl` and `thumbnailUrl.ts` remain available for post-image use cases, where server-side resize might still be added later via a separate change).

### 5. Cache invalidation on upload

- `uploadUserProfilePhoto` calls `removeCachedUserData(uid, cacheVersion)` on success so the new (smaller, properly-sized) URL is fetched on the next render.

## Capabilities

### New Capabilities

- `avatar-rendering`: Unified strategy for resolving, sizing, and rendering user profile photos across the app. Covers the client-side pre-upload resize, the file picker's iOS-friendly accept attribute, Storage upload metadata, and the consolidated render path through `ComposedAvatar`.

### Modified Capabilities

_None — no existing specs at `openspec/specs/`._

## Impact

**Code touched**:

- `apps/web/src/shared/utils/resizeImageBlob.ts` — NEW
- `apps/web/src/shared/utils/storageConstants.ts` — NEW (`AVATAR_CACHE_CONTROL` constant)
- `apps/web/src/user/api/user.ts → uploadUserProfilePhoto` — Canvas resize call + cacheControl + cache invalidation
- `apps/web/src/user/components/EditAccountPage.tsx` — `accept='image/jpeg'`
- `apps/web/src/shared/ui/ComposedAvatar.tsx` — simplified to a thin wrapper, no async resolution
- 12 avatar call-site files (Layer A list above)

**Schema / Infrastructure**:

- No Supabase migration.
- No Cloud Functions.
- No Firebase Storage Resize Images extension changes (extension keeps existing in `firebase.json:97-99` as a harmless no-op; can be removed in a future cleanup).
- No backfill scripts.
- No environment variable changes.

**Behavior change**:

- New uploads are 256×256 JPEG (~10–30 KB) instead of arbitrary-size originals (today: typically 5–15 KB for the 46 existing users, but could be MBs for any future power user).
- Existing 46 user avatars continue to render unchanged (still served as originals). They self-heal when users next update their photo. For a 46-user community this is acceptable; the per-user marginal cost is negligible because existing files are already small.
- iPhone HEIC uploads now Just Work via the browser's auto-conversion.

**Out of scope**:

- Server-side resize for post images (`postImages/`) — same problem exists but is a separate scope.
- Removing the Resize Images extension declaration from `firebase.json` — separate cleanup.
- Adding `loading='lazy'` to avatar images where it's missing — implicit in routing through `ComposedAvatar` (which already sets `loading="lazy"`).

**Risk**:

- Canvas resize quality at 0.85 / JPEG: confirmed visually acceptable for small (128–256 px) avatars; if not, can be bumped to 0.9 or 0.92 trivially.
- Older browsers without `OffscreenCanvas`: fall back to `HTMLCanvasElement` (universal support). Both APIs are supported in all modern browsers used by the target Korean audience.
- Avatar dimension change (256×256 vs. unknown current sizes): minor — `Avatar` size is set by CSS, not natural image dimensions.
- **JPEG re-encode quality loss for text/logo avatars**: a user uploading a screenshot or logo with sharp text at 256×256 will receive visibly ringing artifacts at quality 0.85. Acceptable for photo-avatar primary use case; users with text-heavy avatars who notice can re-upload at slightly higher resolution which the Canvas resize preserves better.
- **Existing 46 users keep their non-optimized avatars** until their next photo update. Acceptable because sampled originals are already small (5–8 KB) and the user count is small. No nudge UI; self-heals organically.

## Relationship to the existing `optimize-avatar-caching` change

`optimize-avatar-caching` (already committed on this branch) was designed under the assumption that the resize extension was producing variants but the *delivery* of those variants was suboptimal. The premise turned out to be wrong (variants don't exist at all). That change's Cloud Function + Supabase column + thumb URL persistence + backfill scripts solve a problem that vanishes once resizing happens client-side.

This change supersedes `optimize-avatar-caching`. On merge, the older change should be archived without implementation (its proposal/design/review documents remain valuable history). The Layer A 12-site refactor that was part of the older proposal is now folded into this change.
