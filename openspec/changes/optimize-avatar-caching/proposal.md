## Why

User profile photos (avatars) are rendered on nearly every social surface in the app — every comment, notification, author list, and stats card. Today they ship inefficiently along three independent axes:

1. **12 of ~13 avatar call sites bypass the optimized renderer** (`ComposedAvatar`) and render raw `<AvatarImage>` with the original Storage URL — a multi-MB phone selfie can land in a 24 px circle.
2. **`useThumbnailUrl` triggers a double-fetch race**: render starts the original download, then swaps to the `_128x128` URL once `getDownloadURL` resolves async — every avatar pays this cost on every fresh paint.
3. **Firebase Storage avatars are uploaded without `Cache-Control` metadata**, so even after the right URL is resolved, the browser HTTP cache cannot reuse the bytes effectively across sessions.

Fixing these three together shrinks per-avatar transfer by 10–100×, eliminates one network round-trip per avatar on first paint, and makes the browser HTTP cache do real work on repeat visits. The change ships as a stack of three PRs (A → C → B) with a measurement gate between each merge so each layer's marginal value is validated against `tests/image-perf.spec.ts` before the next one lands.

### Why not B alone?

Reviewers flagged that Layer B (Cache-Control headers) alone could capture most of the value with much less work. We are deliberately holding the A+C+B scope because:

- **B fixes cross-session reuse but not first-paint cost.** The double-fetch race in `useThumbnailUrl` still fires on every cold load, sending the original and then the thumb — even if both end up cached. C eliminates this swap entirely.
- **A is a precondition for B to matter on Google avatars** (most call sites use raw `<AvatarImage>` which never adds the `=s{size}` param).
- **The 12-site fragmentation is a long-tail bug source**, and continuing to maintain two render paths is expensive. The cost of A is mostly mechanical refactor.

Per-layer value will be validated by the measurement gate: if a layer fails to move the needle in `image-perf.spec.ts` numbers, we document and decide whether to keep it before merging the next.

## What Changes

### Layer A — Unify avatar rendering (PR1)

- Route all 12 avatar call sites through `ComposedAvatar` instead of raw `<AvatarImage>`:
  `CommentHeader`, `AuthorList`, `NotificationItem`, `ActiveUserProfileList`, `ReactionUserDrawer`, `ReactionUserTooltip`, `BlockedUsersPage` (×2 call sites), `UserPostingStatsCard`, `UserCommentStatsCard`, `UserProfile`, `EditAccountPage`.
- Each call site passes its pixel size to `ComposedAvatar` so Google avatars get the right `=s{size}` param and Firebase avatars resolve to the matching resized variant.
- All call sites must pass a consistent `fallback` so accounts without avatars render correctly (initials or icon — no broken circles).
- Skip `MockCommentRow` (skeleton/test scaffold, not production rendering).
- **Measurement gate**: run `tests/image-perf.spec.ts` before/after; record total transfer KB and the count of `oversized` images.

### Layer C — Persisted thumbnail URL (PR2, depends on A)

- **BREAKING (schema)**: Add `profile_photo_thumb_url TEXT` column to Supabase `users` table (nullable).
- Populate the column at upload time. Two viable approaches deferred to design.md:
  - **Upload-time client resolution**: `uploadUserProfilePhoto` waits/polls for the resize extension's `_128x128` variant, resolves its download URL, writes it back to the users row.
  - **Cloud Function trigger** (reviewer-suggested): `object.finalize` event on `profilePhotos/*_128x128.*` writes the resolved URL to the users row reactively. Eliminates client-side race. More infra surface but more reliable.
- Surface the new field on the `User` model and all read paths (`fetchUserFromSupabase`, `fetchAllUsersFromSupabase`, `fetchUsersWithBoardPermissionFromSupabase`, `fetchBatchUsersBasic`).
- Flow the field into the notification mapper so `notification.fromUserProfileImage` carries the resized URL too.
- Simplify `ComposedAvatar` to prefer the persisted thumb URL when present; remove the render-time `useThumbnailUrl` swap for the common path.
- **Upload-race UX**: when `profile_photo_thumb_url` is null (post-upload, pre-resize), render falls back to the original URL. Detailed strategy (object URL preview during in-progress upload, retry-on-null logic, EditAccountPage live-preview handling) deferred to design.md.
- Backfill: one-time script resolves and populates `profile_photo_thumb_url` for existing users.
- **Measurement gate**: re-run `image-perf.spec.ts`; expect the count of network requests per avatar on first paint to drop (no swap) and `naturalWidth/Height` to match the displayed size.

### Layer B — HTTP cache headers (PR3, independent of A/C)

- Set `Cache-Control: public, max-age=2592000` (30 days) metadata when uploading new avatars via `uploadUserProfilePhoto`.
- One-time backfill script updates Storage metadata on existing files under `profilePhotos/` (including resize-extension outputs `profilePhotos/*_128x128.*`).
- **Cross-device staleness chain** (was implicit, now explicit): when a user re-uploads, the resize extension writes a new `_128x128` with a new download URL token. Layer C writes the new URL into the `users` row. Other clients reading the User row will see the new URL after their local `userCache.ts` entry expires — **the effective stale-avatar window on other devices is ≤24 h** (the user-cache TTL), regardless of the 30 d HTTP cache TTL. New URL → new HTTP cache entry → fresh bytes. The 30 d max-age never causes user-visible staleness beyond the 24 h user-cache bound.
- **Measurement gate**: run `image-perf.spec.ts` on cold + warm cache; expect repeat-visit transfer to drop to ~0 KB for unchanged avatars.

## Capabilities

### New Capabilities

- `avatar-rendering`: Unified strategy for resolving, caching, and rendering user profile photos across the app. Covers the rendering wrapper contract, the persisted thumbnail URL on the user model, Storage upload metadata, upload-race fallback rules, and backfill operations.

### Modified Capabilities

_None — no existing specs at `openspec/specs/`._

## Impact

**Code touched**:

- `apps/web/src/shared/ui/ComposedAvatar.tsx` — simplified to prefer persisted thumb URL.
- `apps/web/src/shared/ui/avatar.tsx` — unchanged (primitive wrapper).
- `apps/web/src/shared/utils/thumbnailUrl.ts`, `apps/web/src/shared/hooks/useThumbnailUrl.ts` — retained for post images and as fallback only; no longer in the avatar hot path.
- All 12 avatar call sites listed under Layer A.
- `apps/web/src/user/api/user.ts` — `uploadUserProfilePhoto` writes `cacheControl` (B) and persists thumb URL (C; via chosen design.md approach).
- `apps/web/src/user/api/userReads.ts` and batch user reads — include `profile_photo_thumb_url`.
- `apps/web/src/user/model/User.ts` — add `profilePhotoThumbURL` field.
- `apps/web/src/notification/api/notificationReads.ts` — select and propagate thumb URL into `profileMap`.
- `apps/web/src/user/cache/userCache.ts` — extend `isValidUserData` to validate the new field.

**Schema**:

- Supabase migration: `ALTER TABLE users ADD COLUMN profile_photo_thumb_url TEXT`.
- No RLS changes (column inherits row-level policy).

**Infrastructure / Operations**:

- One-time backfill scripts (two: thumb URL backfill for C, Cache-Control backfill for B).
- Firebase Storage Resize Images extension already configured — no extension changes.
- Possible new Cloud Function (`onObjectFinalize` for `profilePhotos/*_128x128.*`) if design.md chooses the trigger approach.

**Out of scope**:

- Service Worker / Cache Storage API (option D from exploration) — deferred until A/B/C land.
- Google avatar caching headers — Google CDN controls these; we already use the `=s{size}` size hint.
- Post image (`postImages/`) caching — same one-line `cacheControl` change would apply but is out of scope for this change. Worth a follow-up after B ships.
- LQIP/blurhash placeholders.
- Content-hashed Storage paths (would eliminate any staleness but adds upload-side complexity; rejected because the 24 h user-cache bound is acceptable).

**Risk**:

- Resize extension is async; the upload flow must handle the race where `_128x128` doesn't yet exist. Specific fallback behavior is defined in design.md.
- Migration adds a nullable column → backwards-compatible for any concurrent reads during deploy.
- Cross-device avatar staleness is bounded by 24 h (the `userCache.ts` TTL), documented above.
- Per-layer marginal value is unproven without measurement; mitigated by the measurement gate between each PR merge.

## Measurement Plan

Run `tests/image-perf.spec.ts --project=chromium` against an authenticated session before each PR merges. Record in `verify_report.md`:

- Total transfer KB
- Number of `oversized` images flagged
- LCP and CLS
- Per-avatar transfer KB (sample at least one feed page and one long comment thread)

A layer that does not measurably improve at least one of `total transfer KB`, `oversized count`, or `LCP` for avatar-dominant pages must be re-justified or dropped before merge.
