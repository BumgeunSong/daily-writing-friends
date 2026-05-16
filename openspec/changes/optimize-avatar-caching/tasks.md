## 1. PR1 — Layer A: Unify avatar rendering

### 1a. Preflight

- [ ] 1.1 Capture baseline metrics: run `npx playwright test tests/image-perf.spec.ts --project=chromium` against an authenticated dev session on a board feed and a long comment thread; archive the JSON report
- [ ] 1.2 Decide the per-PR avatar transfer-KB threshold from the baseline (record in `verify_report.md`)

### 1b. Call-site refactor (12 sites)

- [ ] 1.3 `apps/web/src/comment/components/CommentHeader.tsx` → use `ComposedAvatar` with `size`, `fallback`, `alt`
- [ ] 1.4 `apps/web/src/board/components/AuthorList.tsx`
- [ ] 1.5 `apps/web/src/notification/components/NotificationItem.tsx`
- [ ] 1.6 `apps/web/src/login/components/ActiveUserProfileList.tsx`
- [ ] 1.7 `apps/web/src/comment/components/ReactionUserDrawer.tsx`
- [ ] 1.8 `apps/web/src/comment/components/ReactionUserTooltip.tsx`
- [ ] 1.9 `apps/web/src/user/components/BlockedUsersPage.tsx` (×2 call sites at lines 78 and 326)
- [ ] 1.10 `apps/web/src/stats/components/UserPostingStatsCard.tsx`
- [ ] 1.11 `apps/web/src/stats/components/UserCommentStatsCard.tsx`
- [ ] 1.12 `apps/web/src/user/components/UserProfile.tsx`
- [ ] 1.13 `apps/web/src/user/components/EditAccountPage.tsx`
- [ ] 1.14 Add a comment to `apps/web/src/shared/components/MockCommentRow.tsx` noting intentional non-use of `ComposedAvatar`

### 1c. Visual regression baseline

- [ ] 1.15 Add a Playwright spec that captures `toHaveScreenshot()` baselines for: comment thread, notification list, blocked users page, edit account page, user profile
- [ ] 1.16 Commit the baseline images under `tests/__screenshots__/avatar-rendering/`

### 1d. Measurement gate (PR1)

- [ ] 1.17 Extend `tests/image-perf.spec.ts` with hard assertions:
  - `expect(oversizedAvatarCount).toBe(0)`
  - `expect(allAvatars.every(hasLazyLoading)).toBe(true)`
- [ ] 1.18 Add an avatar-vs-post classification helper (use the existing `context` field; sample by alt text matching `/profile|avatar|user/i` or DOM ancestor `.avatar`)
- [ ] 1.19 Run the extended spec; record results in `verify_report.md` under "PR1 measurement"
- [ ] 1.20 If a layer-A metric fails to improve over baseline, document and decide before merging PR2

## 2. PR2 — Layer C: Persisted thumbnail URL

### 2a. Preconditions

- [ ] 2.1 **Storage rule**: add `match /profilePhotos/{userId}/{allPaths=**} { allow read; allow write: if request.auth.uid == userId; }` to `firebase/storage.rules`
- [ ] 2.2 Deploy Storage rules; verify with a manual emulator test (upload to own uid succeeds; upload to another uid is denied)

### 2b. Schema migration

- [ ] 2.3 Create Supabase migration: `ALTER TABLE users ADD COLUMN profile_photo_thumb_url TEXT;`
- [ ] 2.4 Apply against local Supabase; verify column appears with `\d users`
- [ ] 2.5 Confirm RLS policy on `users` covers the new column (no policy change needed; row policy applies)

### 2c. Cloud Functions setup (first Function in repo)

- [ ] 2.6 Scaffold `functions/` directory: `package.json`, `tsconfig.json`, `.eslintrc`, `src/index.ts`
- [ ] 2.7 Add npm scripts: `lint`, `build` (referenced by `firebase.json:56-58`)
- [ ] 2.8 Configure Firebase Secret Manager: `firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY`
- [ ] 2.9 Document the key-rotation runbook in `docs/runbooks/avatar-thumb-function.md`

### 2d. Reactive Cloud Function (D1)

- [ ] 2.10 Implement `onProfilePhotoResizeFinalize` (`functions/src/onProfilePhotoResizeFinalize.ts`):
  - Storage `object.finalize` trigger
  - Path regex `^profilePhotos\/([^/]+).*_128x128\.[^.]+$`
  - uid validation (regex match + Supabase existence check)
  - Set `cacheControl: 'public, max-age=2592000'` metadata on the resized object
  - Scoped `UPDATE users SET profile_photo_thumb_url = $1 WHERE id = $2`
- [ ] 2.11 Bind Supabase secret via `runWith({ secrets: ['SUPABASE_SERVICE_ROLE_KEY'] })`
- [ ] 2.12 Deploy Function and confirm via Firebase console; enable error-rate alert (≥1 failure / 5 min)

### 2e. Scheduled self-healing Function (D1b)

- [ ] 2.13 Implement `onScheduleProfileThumbBackfill` (`functions/src/onScheduleProfileThumbBackfill.ts`):
  - Cloud Scheduler weekly cron
  - Query: `SELECT id, profile_photo_url FROM users WHERE profile_photo_url IS NOT NULL AND profile_photo_thumb_url IS NULL LIMIT 500`
  - Per-row: derive expected `_128x128` path, `getDownloadURL`, UPDATE
- [ ] 2.14 Deploy and trigger once manually to verify

### 2f. Backfill script

- [ ] 2.15 Create `scripts/backfill-profile-thumb-urls.ts` following `scripts/backfill-resize-images.ts` pattern:
  - Default dry-run
  - Required `--prod` flag with `[y/N]` confirmation
  - Idempotent (skip rows where `profile_photo_thumb_url IS NOT NULL`)
- [ ] 2.16 Run dry-run against prod; record affected row count
- [ ] 2.17 Run `--prod` after migration deploys

### 2g. Verify the deploy-gap

- [ ] 2.18 Run query against prod: `SELECT count(*) FROM users WHERE profile_photo_url IS NOT NULL AND profile_photo_thumb_url IS NULL` — expect 0 (or very small lag-window count); record in `verify_report.md`

### 2h. User model + cache

- [ ] 2.19 Add `profilePhotoThumbURL: string | null` to `UserOptionalFields` in `apps/web/src/user/model/User.ts`; add to optional fields on `User` interface
- [ ] 2.20 Add code comment in `User.ts` linking the field to `userCache.ts` validator
- [ ] 2.21 `apps/web/src/user/cache/userCache.ts`: `isValidUserData` does NOT require the field (backward compat); add code comment

### 2i. Read paths + mappers

- [ ] 2.22 `apps/web/src/user/api/userReads.ts`: extend SELECT in `fetchUserFromSupabase`, `fetchAllUsersFromSupabase`, `fetchUsersWithBoardPermissionFromSupabase`, `fetchBatchUsersBasic` to include `profile_photo_thumb_url`; map to `profilePhotoThumbURL`
- [ ] 2.23 `apps/web/src/user/api/user.ts` (write path): include the field in `upsert` payloads where User is round-tripped
- [ ] 2.24 `apps/web/src/user/utils/userMappers.ts`: map the new column

### 2j. Notification mapper (D10 — COALESCE)

- [ ] 2.25 `apps/web/src/notification/api/notificationReads.ts`: SELECT both `profile_photo_url` and `profile_photo_thumb_url`; `profileMap.get(actor_id)` returns `thumb ?? original`

### 2k. ComposedAvatar prefers thumbSrc

- [ ] 2.26 `apps/web/src/shared/ui/ComposedAvatar.tsx`: add optional `thumbSrc?: string | null`; when non-empty, render directly and skip `useThumbnailUrl`
- [ ] 2.27 When `thumbSrc` is absent, preserve today's path (`useThumbnailUrl` for Firebase, `=s{size}` for Google) — backward compat

### 2l. Upload cache invalidation (D4)

- [ ] 2.28 `apps/web/src/user/api/user.ts → uploadUserProfilePhoto`: on success, call `removeCachedUserData(uid, cacheVersion)`

### 2m. Wire `thumbSrc` at call sites

- [ ] 2.29 Pass `thumbSrc={user.profilePhotoThumbURL}` at all 12 call sites refactored in PR1
- [ ] 2.30 Pass `thumbSrc={notification.fromUserProfileImage}` at `NotificationItem` (note: the field now carries the thumb URL via the COALESCE mapper)

### 2n. EditAccountPage local preview (D3)

- [ ] 2.31 Add a `useObjectURL(file)` hook in `apps/web/src/shared/hooks/useObjectURL.ts` with `useEffect` cleanup that revokes on unmount or file change
- [ ] 2.32 Use the hook in `EditAccountPage` to render an instant preview the moment the user picks a file

### 2o. Measurement gate (PR2)

- [ ] 2.33 Extend `tests/image-perf.spec.ts` with PR2 assertions:
  - `expect(perAvatarNetworkRequestCount).toBe(1)` for users with non-null `profile_photo_thumb_url`
  - `expect(maxAvatarColdTransferKB).toBeLessThan(threshold)` (threshold from PR1 baseline)
- [ ] 2.34 Run the spec; record in `verify_report.md` under "PR2 measurement"

## 3. PR3 — Layer B: Cache-Control headers

### 3a. Constants

- [ ] 3.1 Create `apps/web/src/shared/utils/storageConstants.ts` exporting `AVATAR_CACHE_CONTROL = 'public, max-age=2592000'`

### 3b. Upload path

- [ ] 3.2 `apps/web/src/user/api/user.ts → uploadUserProfilePhoto`: pass `{ cacheControl: AVATAR_CACHE_CONTROL }` to `uploadBytes`

### 3c. Backfill script

- [ ] 3.3 Create `scripts/backfill-storage-cache-control.ts`:
  - List files under `profilePhotos/` (including resize outputs `*_128x128.*`)
  - Default dry-run; `--prod` flag with `[y/N]` confirmation
  - For each file: `file.setMetadata({ cacheControl: AVATAR_CACHE_CONTROL })`
- [ ] 3.4 Run dry-run; verify file count
- [ ] 3.5 Run `--prod`

### 3d. Measurement gate (PR3)

- [ ] 3.6 Extend `tests/image-perf.spec.ts` with PR3 warm-cache assertions:
  - `expect(warmCacheAvatarTransferKB).toBeLessThan(1)`
  - `expect(avatarsCarryCacheControlHeader).toBe(true)` (read from `PerformanceResourceTiming` or directly inspect response header via Playwright's `response.headers()`)
- [ ] 3.7 Run the spec on a session with a primed cache; record in `verify_report.md` under "PR3 measurement"

## Tests

### Unit (Vitest)

- [ ] T.1 `ComposedAvatar`: renders `thumbSrc` directly when present, falls back to `useThumbnailUrl` for Firebase originals, appends `=s{size}` for Google avatars, renders fallback when both src/thumbSrc absent (matches Requirement: ComposedAvatar prefers a pre-resolved thumbnail URL)
- [ ] T.2 `uploadUserProfilePhoto`: passes `cacheControl: AVATAR_CACHE_CONTROL` to `uploadBytes`; calls `removeCachedUserData(uid)` on success; does not invalidate on failure
- [ ] T.3 `isValidUserData`: accepts User with `profilePhotoThumbURL: string | null`; accepts User WITHOUT the field (pre-migration cached entry)
- [ ] T.4 `userMappers`: maps `profile_photo_thumb_url` → `profilePhotoThumbURL`
- [ ] T.5 Cloud Function uid regex (`^profilePhotos\/([^/]+).*_128x128\.[^.]+$`): fixture table of valid/invalid paths
- [ ] T.6 Cloud Function Supabase payload: mocked admin client receives a scoped single-column UPDATE; no other columns mutated
- [ ] T.7 Cloud Function uid validation: rejects regex mismatches; rejects uids not present in `users`
- [ ] T.8 `useObjectURL` hook: revokes object URL on unmount and when input file changes
- [ ] T.9 Backfill script idempotency: running twice against the same mocked store produces zero writes on the second run

### Integration (Vitest)

- [ ] T.10 `fetchUserFromSupabase` (mocked Supabase client): SELECT statement includes `profile_photo_thumb_url`; returned User carries it
- [ ] T.11 `fetchBatchUsersBasic`: includes the new column
- [ ] T.12 `notificationReads.ts`: SELECT includes both URLs; `profileMap` returns `thumb ?? original`; `fromUserProfileImage` on the mapped Notification reflects the COALESCE

### E2E Network Passthrough (agent-browser + image-perf.spec.ts)

- [ ] T.13 Long comment thread render: every avatar `<img>` has `loading="lazy"` (PR1)
- [ ] T.14 Long comment thread render: 1 network request per avatar (PR2)
- [ ] T.15 Reload comment thread with warm cache: avatar transfer ~0 KB (PR3)
- [ ] T.16 Upload via EditAccountPage: object-URL preview appears immediately
- [ ] T.17 After upload settles + navigate to comment thread: new avatar renders correctly
- [ ] T.18 Playwright `toHaveScreenshot()` snapshot diff: all migrated surfaces match committed baselines (PR1)

### E2E Local DB (Supabase local Docker + Firebase emulators)

- [ ] T.19 Upload through the app against local Supabase + Storage emulator + Functions emulator: within ~5 s of finalize, `users.profile_photo_thumb_url` is populated by the Function
- [ ] T.20 Re-upload replaces `profile_photo_thumb_url` with the new URL
- [ ] T.21 Upload-race window: pause Functions emulator finalize; confirm `ComposedAvatar` renders original URL via `useThumbnailUrl` fallback during the gap; resume; confirm next refetch shows thumb URL (manual reproduction acceptable if scripting the pause is brittle)
- [ ] T.22 Storage rule enforcement: attempt upload to `profilePhotos/{other-uid}/...` as user A → expect permission-denied
- [ ] T.23 RLS: non-owner can SELECT another user's `profile_photo_thumb_url`; cannot UPDATE
- [ ] T.24 Backfill script dry-run correctly identifies rows with non-null original + null thumb URL
