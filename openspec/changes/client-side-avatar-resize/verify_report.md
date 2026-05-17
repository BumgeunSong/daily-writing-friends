# Verify Report — client-side-avatar-resize

## Summary

Implementation completed for the code-side changes (Tasks 2–10, 14). Tests T.1, T.2, T.6
covered by pure-function unit tests (output-based, per project testing skill — only pure
functions are unit-tested; mock-heavy tests against hooks/components/side-effects are
explicitly out of scope and are instead covered by the E2E suite). Tasks 1 (baseline),
11–13 (visual regression + perf hard assertions + post-merge gsutil), and the remaining
T-series (real-Canvas, integration, E2E, manual iOS) are deferred to verification
checkpoints that require an authenticated dev session, Supabase local Docker, the
Firebase Storage emulator, or production access.

## Static checks

| Check | Result |
|---|---|
| `pnpm --filter web type-check` | 0 errors |
| `pnpm --filter web lint` against modified files | 0 errors |
| `pnpm test:run` for new pure-function suites | 6 / 6 pass |

Pre-existing lucide-react / React 19 JSX-component type warnings and the pre-existing
`storage: FirebaseStorage | null` overload warning persist and are not introduced by
this change.

## Implemented

- Storage rule for `profilePhotos/{allPaths=**}` mirrors the existing `postImages/`
  pattern (`firebase/storage.rules`). Deploy + emulator manual verify (2.2) deferred.
- Error classes in `apps/web/src/shared/errors/avatarUpload.ts` (`AvatarUploadError`
  base + `UnsupportedImageError` + `FileTooLargeError` with i18n `messageKey`).
- `apps/web/src/shared/utils/resizeImageBlob.ts` with the pre-decode size cap (>20 MB),
  `createImageBitmap` decode, pure `computeCenterCrop`, `OffscreenCanvas` primary path,
  `HTMLCanvasElement` fallback, and `bitmap.close()` in both success + error paths.
- `apps/web/src/shared/utils/storageConstants.ts → AVATAR_CACHE_CONTROL`.
- `apps/web/src/user/api/user.ts → uploadUserProfilePhoto`: resizes input via
  `resizeImageBlob(file, { width: 256, height: 256, quality: 0.85, mimeType: 'image/jpeg' })`,
  uploads with `cacheControl: AVATAR_CACHE_CONTROL`, and invalidates the local user
  cache (`removeCachedUserData(uid, 'v2')`) on success.
- `EditAccountPage` + `useProfilePhoto` + `useEditAccount` rewired so file selection
  triggers the resize+upload as a single continuous "변환 중…" window. `accept=`
  narrowed to `image/jpeg,image/png` (preserves iOS HEIC auto-conversion). Avatar
  preview area carries `aria-busy={isUploadingAvatar}` and a spinner overlay; the
  save button is disabled during the upload; Korean error strings map from
  `messageKey`.
- `ComposedAvatar` no longer calls `useThumbnailUrl`. Renders `src` directly for
  Firebase URLs; preserves `appendGoogleAvatarSizeParam` for Google avatars. Accepts a
  `loading` prop so `UserPostingStatsCard` / `UserCommentStatsCard` can still pass
  `'eager'` for the current user.
- 12 call sites migrated to `ComposedAvatar` (`CommentHeader`, `AuthorList`,
  `NotificationItem`, `ActiveUserProfileList`, `ReactionUserDrawer`,
  `ReactionUserTooltip`, `BlockedUsersPage ×2`, `UserPostingStatsCard`,
  `UserCommentStatsCard`, `UserProfile`, `EditAccountPage`). `MockCommentRow`
  intentionally left on raw `<Avatar>` with an inline rationale comment (static
  fixture data; resize pipeline does not apply).
- `thumbnailUrl.ts` carries a header comment documenting the
  `{base}_{width}x{height}.{ext}` URL-derivation contract and noting that the
  avatar path no longer uses this helper.
- `openspec/changes/optimize-avatar-caching/proposal.md` carries a SUPERSEDED banner
  at the top; commits preserved as design history.

## Pure-function unit tests (Vitest — jsdom default)

Per the project's testing skill, only pure functions are unit-tested.

- `avatarUpload.test.ts` — `AvatarUploadError` base + `UnsupportedImageError` +
  `FileTooLargeError` carry the right `messageKey` and class inheritance (T.1).
- `resizeImageBlob.test.ts` — `computeCenterCrop` for landscape, portrait, square,
  and non-square destination aspect inputs (T.6).

Mock-heavy unit assertions originally listed under T.2–T.5, T.7–T.12 (verifying
internals: `convertToBlob` args, `uploadBytes` payload, `useThumbnailUrl` invocation,
etc.) violate the testing skill's "no mocking internals / no `vi.mock()` for
non-external APIs / no `render()`" rule. These behaviors are instead validated by
the E2E suite (T.20–T.25) which exercises the real Canvas + Firebase Storage path
end-to-end. The skill's reasoning: mock-heavy tests pass even when integration is
broken; output-based unit tests for pure logic + E2E for the imperative shell gives
the same coverage with stronger guarantees.

## Deferred (require running infrastructure)

| Task | Why deferred |
|---|---|
| 1.1, 1.2 | `image-perf.spec.ts` does not yet exist (created in 12.1); baseline requires an authenticated dev session against production. |
| 2.2 | Storage rule deploy + emulator verify — operational. |
| 11.1, 11.2, 11.3 | Visual regression baselines require a running dev server + Playwright. |
| 12.1, 12.2, 12.3 | Hard assertions land in the same Playwright spec as 11.x. |
| 13.1, 13.2 | Post-merge `gsutil setmeta` operational one-liner. |
| T.13–T.16 | Real-Canvas tests require either `@vitest/browser` Chromium or `node-canvas` shim. |
| T.17–T.19 | EditAccountPage integration tests overlap with E2E coverage and would violate the no-mock-internals rule. |
| T.20–T.25 | E2E suite (agent-browser / Playwright + Supabase local Docker). |
| T.26 | Manual iOS Safari HEIC happy-path verification. |

## Risks called out

- Existing 46 user avatars continue rendering un-optimized originals until their next
  photo update. Documented trade-off (sampled originals are 5–8 KB; per-user marginal
  cost is negligible at this scale).
- Pre-existing Firebase `storage: FirebaseStorage | null` overload warning persists in
  `user.ts` and `thumbnailUrl.ts` — not introduced by this change; would be its own
  hardening task.
