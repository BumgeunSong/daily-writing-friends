## Context

DailyWritingFriends renders user avatars on most social surfaces (comments, notifications, author lists, stats cards). Today the renderer is fragmented (12 of ~13 call sites bypass the optimized `ComposedAvatar` and use raw `<AvatarImage>`), the optimized path itself triggers a double-fetch race via `useThumbnailUrl`, and uploaded avatars carry no `Cache-Control` metadata so browser HTTP caching is ineffective across sessions.

Current architecture:

- **Storage**: Firebase Storage with the `storage-resize-images@0.3.3` extension, writing `_128x128` variants for any image uploaded under `profilePhotos/`.
- **DB**: Supabase `users` table holds `profile_photo_url` (the original download URL).
- **Read path**: `fetchUserFromSupabase` → `User` model → `useUser` hook → `userCache.ts` localStorage (24 h TTL).
- **Render path**: `ComposedAvatar` calls `useThumbnailUrl(originalUrl, '128x128')` which sets `src=original` first, then async-resolves the `_128x128` download URL via `getDownloadURL` and swaps.
- **Upload path**: `uploadUserProfilePhoto(userId, file)` in `apps/web/src/user/api/user.ts:84-88` calls `uploadBytes(ref('profilePhotos/' + userId), file)` and returns the download URL — no metadata passed.
- **Notification path**: `notificationReads.ts` builds a `profileMap` from `actor_id → profile_photo_url` directly.
- **Functions**: `firebase.json` declares a `functions/` codebase but the directory does not yet exist. This change introduces the first Cloud Function.

The proposal commits to a stacked rollout A → C → B with a measurement gate (`tests/image-perf.spec.ts`) between each PR.

## Goals / Non-Goals

**Goals:**

- All avatar renders pass through `ComposedAvatar` with consistent fallback handling.
- The resized 128×128 URL is available synchronously at render time, eliminating the `useThumbnailUrl` swap race for the common (post-backfill) case.
- Uploaded avatars carry `Cache-Control: public, max-age=2592000` so cross-session reuse is handled by the browser HTTP cache.
- Persistence of the thumb URL survives Function failures (self-healing scheduled re-derivation).
- Trust boundary: only the owner of `profilePhotos/{userId}` can write there.
- Each layer is independently measurable via `tests/image-perf.spec.ts` with hard assertions.

**Non-Goals:**

- Service Worker or Cache Storage API (deferred — option D from exploration).
- Optimizing Google avatar caching (Google CDN handles it; we just pass `=s{size}`).
- Optimizing post images (`postImages/`) — same techniques apply but out of scope.
- Eliminating staleness below the 24 h `userCache.ts` TTL bound.
- Content-hashed Storage paths.
- Migrating admin app avatar surfaces.

## Decisions

### D1. Cloud Function trigger populates `profile_photo_thumb_url` and sets `cacheControl` on the resized object (Layer C + B)

**Decision**: Add a Firebase Cloud Function listening to `object.finalize` on Storage objects matching `profilePhotos/**/*_128x128.*`. When the resize extension writes a `_128x128` variant, the function:

1. Validates the uid extracted from the path (regex match → UUID format check).
2. Reads/generates a stable download URL for the resized object.
3. **Sets `cacheControl: 'public, max-age=2592000'` metadata directly on the resized object** (closes QUAL-2 — no dependency on extension metadata propagation).
4. Performs a scoped `UPDATE users SET profile_photo_thumb_url = $1 WHERE id = $2` (single-column write, parameterized).

**Why over alternatives**:

| Alternative | Why rejected |
|---|---|
| Client-side polling after upload (`getDownloadURL` retry loop with timeout) | User can navigate away mid-poll; race window depends on extension latency; leaves column null on failure with no retry. |
| Synchronous wait + block UI | Bad UX; no upper bound on upload time. |
| Lazy resolve-and-write-back on first read | Reads do writes (RLS complexity); cold-cache reads slow until backfill catches up. |

**Operational surface** (closes ARCH-1, SEC-2):

- **Supabase service-role key** stored in Firebase Secret Manager (`firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY`), bound to the Function via `runWith({ secrets: ['SUPABASE_SERVICE_ROLE_KEY'] })`. Never in plain env or git.
- **Scoped writes**: the Function only writes `profile_photo_thumb_url`. Code review must enforce no field expansion.
- **uid validation**: regex-matched uid is also checked against `SELECT 1 FROM users WHERE id = $1` before UPDATE; reject mismatches.
- **Monitoring**: enable Functions error rate alert in Firebase console (≥1 failure per 5 min triggers).
- **Key rotation**: documented runbook — rotate Supabase service-role key, update Firebase secret, redeploy Function.

### D1b. Scheduled self-healing Function (closes QUAL-1)

**Decision**: Add a second Cloud Function on a Cloud Scheduler trigger (weekly cron) that re-derives missing thumb URLs:

```
SELECT id, profile_photo_url
FROM users
WHERE profile_photo_url IS NOT NULL
  AND profile_photo_thumb_url IS NULL
LIMIT 500
```

For each row, derive the expected `_128x128` Storage path, fetch the download URL, and UPDATE. Idempotent and bounded (limit prevents runaway). This closes the "Function failed silently → column null forever" gap without operator intervention.

### D2. ComposedAvatar prefers `thumbSrc`, falls back to existing path (Layer C)

**Decision**: In PR2, extend `ComposedAvatar` with an optional `thumbSrc` prop. When present, render `thumbSrc` directly (no async resolution). When absent, fall back to today's `useThumbnailUrl` swap. PR1 does NOT pass `thumbSrc` from any call site (closes QUAL-3 — avoids forward-coupling to a not-yet-shipped schema field).

**Why**: backwards-compatible; lets us migrate call sites incrementally; avoids ripping out `useThumbnailUrl` (still used by post images).

**Future sunset** (closes QUAL-3): after backfill reaches 100% coverage, the fallback path should be extracted into a separate component (`AvatarWithAsyncResize`) and `ComposedAvatar` should delegate to it only when `thumbSrc` is absent. Tracked as a follow-up after PR3.

### D3. Upload-race UX fallback (Layer C)

When `profile_photo_thumb_url` is null (post-upload, pre-Function), `ComposedAvatar` renders the original `src` with the existing `useThumbnailUrl` resolution path. Specific UX rules:

- **In-progress upload (file selected, not yet sent)**: `EditAccountPage` shows `URL.createObjectURL(file)` for instant preview. Revoke via `useEffect` cleanup. Recommend a small `useObjectURL` hook to encapsulate the lifecycle.
- **Upload completed, Function not yet fired**: `profilePhotoThumbURL` is still null on the uploader's User row. `ComposedAvatar` renders the original URL with `useThumbnailUrl` fallback (functionally identical to today's behavior). The uploader's local cache is invalidated immediately (D4), so the next refetch picks up the populated thumb URL.
- **Other users seeing the new avatar**: bounded by 24 h user-cache TTL.

### D4. Cache invalidation after upload (Layer C)

**Decision**: `uploadUserProfilePhoto` calls `removeCachedUserData(uid, cacheVersion)` on success. The next `useUser` call refetches from Supabase. The Function may or may not have populated the thumb URL by then — `ComposedAvatar`'s fallback handles either case.

### D5. `Cache-Control` for new uploads (Layer B)

**Decision**: `uploadUserProfilePhoto` passes `{ cacheControl: AVATAR_CACHE_CONTROL }` to `uploadBytes`, where `AVATAR_CACHE_CONTROL = 'public, max-age=2592000'` is a shared constant in `apps/web/src/shared/utils/storageConstants.ts` (closes the magic-string minor finding).

The `_128x128` derived file gets `cacheControl` set directly by the Cloud Function in D1 (closes QUAL-2). The one-shot backfill script also walks existing files for both originals and resized variants (script may be redundant for derived files going forward but still needed for files that existed before the Function was deployed).

### D6. Backfill scripts pattern matches `backfill-resize-images.ts` (Layers B and C)

**Decision**: Two new one-shot scripts under `scripts/`:

- `scripts/backfill-profile-thumb-urls.ts` (Layer C): SELECT users with non-null `profile_photo_url` and null `profile_photo_thumb_url`; for each, derive expected `_128x128` path, call `getDownloadURL`, `UPDATE` the row.
- `scripts/backfill-storage-cache-control.ts` (Layer B): list files under `profilePhotos/`, call `file.setMetadata({ cacheControl: AVATAR_CACHE_CONTROL })` on each.

Safety nets (closes a minor finding): dry-run by default, row-count limit per batch, explicit `--prod` flag required for live runs, prints affected count and prompts `[y/N]` before proceeding when run against production credentials.

### D7. Per-PR measurement gate with HARD assertions (closes TEST-1)

**Decision**: `tests/image-perf.spec.ts` is extended from "reporter" to "regression gate" with explicit `expect` assertions. The exact thresholds are tuned to baselines captured pre-PR1, but the assertion structure is fixed:

```
PR1 (after A):  expect(oversizedAvatars).toBe(0)
                expect(allAvatars.every(hasLazy)).toBe(true)

PR2 (after C):  expect(perAvatarRequestCount).toBe(1)        // no swap
                expect(maxAvatarTransferKB).toBeLessThan(30) // cold load
                expect(noFallbackPathHit).toBe(true)         // for users with thumb URL

PR3 (after B):  expect(warmCacheAvatarTransferKB).toBeLessThan(1) // 200-from-cache
                expect(cacheControlHeaderPresent).toBe(true)
```

Implementation detail: avatar-specific image classification (vs. post images) uses the `context` field already produced by the test (sample at "alt=*profile*" or DOM ancestor `.avatar` class). A separate per-page report keeps post-image metrics from polluting avatar assertions.

### D8. Layer A call-site migration uses a consistent fallback contract

Every migrated site in PR1 passes:

```tsx
<ComposedAvatar
  src={user.profilePhotoURL}
  alt={displayName}
  fallback={displayName?.[0]?.toUpperCase() ?? 'U'}
  size={SIZE_PX}
/>
```

PR1 does NOT pass `thumbSrc` — that prop is added in PR2 only (closes QUAL-3).

In PR2, sites that bind to a `User` (or notification with a thumb URL) add `thumbSrc={user.profilePhotoThumbURL}`. The prop is `string | null | undefined` and the component ignores falsy values.

### D9. User model and cache validator backward compatibility (closes INT-1)

**Decision**:

- `profilePhotoThumbURL: string | null` is added to **`UserOptionalFields`** in `apps/web/src/user/model/User.ts` (NOT `UserRequiredFields`). It is optional on the `User` interface.
- `isValidUserData` in `apps/web/src/user/cache/userCache.ts` does NOT add a required check for `profilePhotoThumbURL` — pre-migration cached entries (without the field) must still validate. The field is treated as `string | null | undefined` and threads through unchanged.
- A code comment in `User.ts` and `userCache.ts` marks the relationship: "When adding required fields to User, update isValidUserData accordingly." (Closes the minor "comment in validator" finding.)

### D10. Notification mapper uses COALESCE, not silent replacement (closes INT-2)

**Decision**: `notificationReads.ts` SELECTs **both** `profile_photo_url` and `profile_photo_thumb_url`:

```sql
SELECT id, profile_photo_url, profile_photo_thumb_url FROM users WHERE id IN (...)
```

`profileMap.get(actor_id)` returns `thumb ?? original` (thumb wins when present). `notification.fromUserProfileImage` retains its original semantic meaning (a usable profile image URL) and gets the thumb optimization for free when available. No field rename needed.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Cloud Function fails → `profile_photo_thumb_url` stays null | (a) `ComposedAvatar` falls back to `useThumbnailUrl` swap (functional, just slower); (b) scheduled self-healing Function (D1b) re-derives weekly; (c) error-rate alert on Firebase console. |
| Storage rule gap → cross-uid upload → avatar hijack via Function | **Blocking precondition for PR2**: add `match /profilePhotos/{userId}/{allPaths=**} { allow read; allow write: if request.auth.uid == userId; }` to `firebase/storage.rules`. Verify with a manual test in the emulator before PR2 ships. |
| Function fires multiple times for one upload (extension reprocessing) | UPDATE is idempotent on the resolved URL. New URL replaces old. |
| Supabase service-role key leaks from Function | Stored in Firebase Secret Manager only; scoped UPDATE prevents arbitrary writes; key rotation runbook documented. |
| Migration runs before Function deploys → null thumb URLs in window | Deploy order strict: (1) Storage rule, (2) migration, (3) Function, (4) backfill, (5) client. Verify-report query checks for null-thumb rows after each step. |
| `Cache-Control: max-age=2592000` causes confusion under misconfig | TTL bounded by 24 h user-cache; URL changes invalidate the cache entry. |
| First Cloud Function in project → new runtime-ownership surface | Documented in proposal Risks. `functions/` scaffolding (package.json, tsconfig, lint) becomes part of PR2. |
| Download URL token rotation on extension reprocessing → brief broken image | Function re-fires on reprocess; UPDATE replaces URL. Brief window only; covered by `ComposedAvatar` fallback. |
| Cross-cloud coupling (Firebase Function ↔ Supabase) | New operational dependency. Manual key rotation cost. Accepted because alternatives are worse. |
| 12-site refactor regresses fallback/size consistency | Playwright `toHaveScreenshot()` baseline captured in PR1; CI compares on each PR. |
| `URL.createObjectURL` not revoked → memory leak | `useObjectURL` hook with `useEffect` cleanup; unit-tested. |

## Migration Plan

**PR1 (Layer A)** — pure client refactor:
1. Refactor 12 call sites to use `ComposedAvatar` with the D8 contract (no `thumbSrc` yet).
2. Capture Playwright `toHaveScreenshot()` baseline.
3. Extend `image-perf.spec.ts` with the PR1 hard assertions (D7).
4. Run measurement; record in `verify_report.md`.
5. **Rollback**: revert client deploy.

**PR2 (Layer C)** — depends on PR1:
1. **Precondition**: `firebase/storage.rules` updated and deployed for `profilePhotos/{userId}` ownership (blocks SEC-1).
2. Supabase migration: `ALTER TABLE users ADD COLUMN profile_photo_thumb_url TEXT;`
3. Scaffold `functions/` (package.json, tsconfig, lint); deploy Function `onProfilePhotoResizeFinalize` (D1) with Supabase secret.
4. Deploy scheduled self-healing Function (D1b).
5. Run `scripts/backfill-profile-thumb-urls.ts` (dry-run, then `--prod`).
6. Run verify_report query: `SELECT count(*) FROM users WHERE profile_photo_url IS NOT NULL AND profile_photo_thumb_url IS NULL` — expect 0 (or very small lag-window count).
7. Client deploy: `User` model, reads, mappers, `ComposedAvatar` prefers `thumbSrc`, notification COALESCE, upload invalidates user cache.
8. Re-run `image-perf.spec.ts` with PR2 hard assertions; record.
9. **Rollback**: revert client (falls back to `useThumbnailUrl` swap); leave Function and column (harmless when unused).

**PR3 (Layer B)** — independent of A/C:
1. Update `uploadUserProfilePhoto` to pass `cacheControl: AVATAR_CACHE_CONTROL`.
2. Run `scripts/backfill-storage-cache-control.ts` (dry-run, then `--prod`).
3. Run `image-perf.spec.ts` warm-cache assertions (D7); record.
4. **Rollback**: leave existing metadata; remove `cacheControl` from upload function for new uploads. No client revert required.

## Open Questions

- Final per-avatar transfer KB threshold for D7 assertions — must be set based on PR1 baseline measurement.
- Whether the scheduled self-healing Function (D1b) ships in PR2 or is a follow-up PR — recommend in PR2 to close QUAL-1 immediately, but it adds ~50 LOC and a Cloud Scheduler resource.

## Testability Notes

### Unit (Layer 1) — Vitest

- `ComposedAvatar`:
  - When `thumbSrc` is provided, renders it directly (no async resolution).
  - When `thumbSrc` is null/undefined and `src` is a Firebase URL, falls back to `useThumbnailUrl` swap path.
  - When `src` is a Google avatar URL, appends `=s{size}` once.
  - When both are null/undefined, renders the `AvatarFallback`.
- `uploadUserProfilePhoto`:
  - Passes `cacheControl: AVATAR_CACHE_CONTROL` to `uploadBytes` (mock storage; assert call args).
  - Calls `removeCachedUserData(uid, cacheVersion)` on success.
- `userCache.ts → isValidUserData`:
  - Accepts a User with `profilePhotoThumbURL: string | null`.
  - Accepts a User WITHOUT `profilePhotoThumbURL` (backwards-compatible with cached pre-migration entries).
- `userMappers.ts`: maps `profile_photo_thumb_url` → `profilePhotoThumbURL`.
- **Cloud Function (D1)** (closes TEST-2):
  - URL extraction regex (`^profilePhotos\/([^/]+).*_128x128\.[^.]+$`) — fixture table of valid/invalid paths.
  - Supabase update payload shape: assert single-column update via mocked admin client.
  - uid validation: reject malformed uids before attempting Supabase update.
- `useObjectURL` hook: cleanup revokes the object URL on unmount (mock `URL.createObjectURL` / `revokeObjectURL`).
- Backfill scripts: idempotency test — running twice against the same mocked store produces zero writes on second run.

### Integration (Layer 2) — Vitest

- `fetchUserFromSupabase` (mock Supabase client):
  - SELECT includes `profile_photo_thumb_url`.
  - Returned `User` carries the value.
- `fetchBatchUsersBasic` (mock): includes the new column.
- `notificationReads.ts`:
  - SELECT includes both `profile_photo_url` and `profile_photo_thumb_url`.
  - `profileMap` returns `thumb ?? original`.
  - `fromUserProfileImage` on the mapped `Notification` is the thumb when available, original otherwise.

### E2E Network Passthrough (Layer 3) — agent-browser + image-perf.spec.ts

- Authenticated session opens a long comment thread:
  - PR1: every avatar `<img>` has `loading="lazy"` and reasonable `naturalWidth/Height`.
  - PR2: each avatar makes exactly 1 image network request (no swap).
  - PR2: per-avatar `transferKB` is below the threshold set at PR1 baseline.
- Reload the same page (warm cache, PR3):
  - Avatar transfer drops to ~0 KB (200 from cache).
- Upload a new profile photo via `EditAccountPage`:
  - Live preview appears immediately (object URL).
  - After upload settles, navigate to a comment thread and confirm the new avatar renders.
- **Playwright visual snapshot baseline (PR1)** (closes TEST-3):
  - `await expect(page).toHaveScreenshot('comment-thread-avatars.png')` captures the migrated state.
  - Subsequent PRs diff against this baseline; CI fails on unexpected visual regressions.
  - Baseline committed under `tests/__screenshots__/`.

### E2E Local DB (Layer 4) — Supabase local Docker + Firebase Storage emulator

- Upload through the app against local Supabase + the Storage emulator + Functions emulator:
  - Within N seconds (target: <5 s after extension finalize), `users.profile_photo_thumb_url` is populated by the Function.
  - Re-uploading replaces the value.
- **Upload-race window** (closes TEST-4): pause/delay the Functions emulator's finalize handler. Confirm `ComposedAvatar` falls back to original URL (via `useThumbnailUrl`) during the gap. Resume; confirm next refetch shows the thumb URL. Manual deterministic reproduction is acceptable for this scenario if emulator pausing is too brittle to script.
- **Storage rule enforcement** (closes SEC-1): attempt upload to `profilePhotos/<another-user-uid>` while authenticated as user A. Expect 403.
- RLS: a non-owner user can SELECT `profile_photo_thumb_url` for any user (same row policy as `profile_photo_url`); cannot UPDATE.
- Backfill script (dry-run): correctly identifies rows with non-null original + null thumb URL.

The Cloud Function itself is fully exercised via the emulators in Layer 4. Manual sandbox verification remains a recommended pre-prod smoke step but is no longer the primary test path.
