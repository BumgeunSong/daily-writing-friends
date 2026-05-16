## Review Summary

**Status**: Needs Revision → Ready (Round 2 applied; remaining items accepted)
**Iteration**: 2 of max 2

Five parallel reviewers (architecture, security, quality, testability, integration) ran in parallel. Three Critical findings were raised and addressed in Round 2; key Important findings were folded into design.md or pushed into tasks.md. Remaining items are documented accepted trade-offs.

## Architecture

`oh-my-claudecode:architect` reviewed the Cloud Function approach, `ComposedAvatar` boundary, migration ordering, long-horizon trade-offs, and the fallback-path retention strategy. The Function approach is judged sound (no `functions/` directory exists yet but `firebase.json` already declares one; emulator is configured). `ComposedAvatar` extension with `thumbSrc` is a clean simplification. Three Important gaps:

- Cloud Function operational surface (Supabase service-role key storage, monitoring, key rotation) is unspecified.
- The migration-to-Function deploy gap is unmonitored — uploads between (1) migration and (2) Function deploy land with null thumb URLs and rely on manual backfill.
- Long-horizon Cloud Functions ownership, URL token durability, and cross-cloud coupling deserve mention in the Risks table.

## Security

`oh-my-claudecode:security-reviewer` flagged a **Critical access-control gap** in `firebase/storage.rules`: `profilePhotos/` has no matching rule and falls through to the catch-all deny. If client uploads actually succeed today, it's because of a misconfiguration. The Cloud Function design parses the uid from the path — without ownership enforcement on `profilePhotos/{userId}`, any authenticated user could upload to `profilePhotos/<victim-uid>` and trigger the Function to overwrite the victim's `profile_photo_thumb_url` (avatar hijacking). Additional Important: Supabase service-role key in Firebase Secret Manager (not env), scoped UPDATE to a single column. Minor: long-lived download URLs (accepted), backfill script confirmation prompts.

## Quality & Performance

`oh-my-claudecode:quality-reviewer` raised one **Critical**: no automated recovery if the Cloud Function fails or the extension doesn't fire — `profile_photo_thumb_url` stays null forever for affected rows. High: (a) "verify extension copies metadata" (D5) is deploy-time hope, not a guarantee — better to have the Cloud Function itself set `cacheControl` on the resized object after finalize; (b) two render paths in `ComposedAvatar` need an explicit sunset plan. Medium: don't wire `thumbSrc` in PR1 (forward-coupling to unshipped schema); extract `cacheControl` value to a constant; mark `isValidUserData` as needing update when `User` shape changes.

## Testability

`oh-my-claudecode:test-engineer` raised one **Critical**: `tests/image-perf.spec.ts` is a measurement reporter, not a regression gate. It has exactly one hard assertion (`totalImages > 0` at line 254). The design's "measurement gate" claim is unsupported by the test as written. Important: Cloud Function regex (`^profilePhotos\/([^/]+).*_128x128\.[^.]+$`) and Supabase update payload must be unit-tested before PR2; visual regression on 12 call sites needs a tool (Playwright `toHaveScreenshot()` proposed); upload-race window testing requires Functions+Storage emulator with finalize delay. Minor: backfill script idempotency unit test; `URL.createObjectURL` revoke test in `EditAccountPage`.

## API & Integration

`oh-my-claudecode:code-reviewer` raised two Important: (a) `User.profilePhotoThumbURL` placement in `UserOptionalFields` (not `UserRequiredFields`) and its handling in `isValidUserData` cache validator must be explicit; (b) the notification path silently changes `fromUserProfileImage` from "original" to "thumb" — should COALESCE thumb with original (`thumb ?? original`) rather than replace, to avoid breaking future consumers that need a larger size. Minor: notification field naming drift (documented); `thumbSrc` prop name is fine; `MockCommentRow` exclusion needs a comment to prevent contract drift; `apps/admin/` parallel migration not needed.

## Consolidated Findings

### Critical

**SEC-1. Storage rules do not enforce ownership on `profilePhotos/{userId}` — avatar-hijack via Cloud Function.**
*(security)* The catch-all deny is bypassed by whatever currently allows client uploads. With Layer C, parsing uid from the path becomes a trust boundary. Any user who can upload to `profilePhotos/<victim-uid>` triggers the Function to write the victim's `profile_photo_thumb_url`. **Fix**: Add `match /profilePhotos/{userId}/{allPaths=**} { allow read; allow write: if request.auth.uid == userId; }` to `firebase/storage.rules` as part of PR2 (or earlier).

**QUAL-1. No automated recovery for null-thumb gap.**
*(quality)* If the Cloud Function fails (misconfig, quota, crash) or the resize extension never fires, `profile_photo_thumb_url` stays null indefinitely. Manual backfill is the only path back. **Fix**: Add a scheduled Cloud Function (Cloud Scheduler trigger, weekly) that re-derives thumb URLs for rows where `profile_photo_url IS NOT NULL AND profile_photo_thumb_url IS NULL`. Self-healing without operator intervention.

**TEST-1. `image-perf.spec.ts` is a reporter, not a gate.**
*(testability)* The design's per-PR measurement gate relies on hard assertions that don't exist. The spec logs metrics but only asserts `totalImages > 0`. **Fix**: Extend the spec with hard assertions: zero `oversized` avatars after A; per-avatar request count == 1 after C; per-avatar transfer KB ≤ a threshold (TBD, e.g., 30 KB for cold load).

### Important

- **ARCH-1**: Document Cloud Function operational surface — service-role key in Firebase Secret Manager (not plain env), monitoring/alerting on Function error rate, runbook for key rotation. → Added to design.md D1 and Risks.
- **ARCH-2**: Migration-to-Function deploy gap monitoring — add a query check in PR2 verify_report (`SELECT count(*) FROM users WHERE profile_photo_url IS NOT NULL AND profile_photo_thumb_url IS NULL`). → Added to tasks.md PR2.
- **ARCH-3**: Long-horizon trade-offs (Functions runtime ownership, URL token re-mint on extension reprocessing, cross-cloud coupling). → Added to Risks table.
- **SEC-2**: Scope the Supabase update to the single column; use Firebase Secret Manager; validate uid format before write. → Added to D1.
- **QUAL-2**: Have the Cloud Function set `cacheControl` on the `_128x128` file directly, eliminating the dependency on extension metadata propagation. → Folded into D5: the Function from D1 also writes `cacheControl` metadata. Removes the "verify extension behavior" risk.
- **QUAL-3**: Don't wire `thumbSrc` in PR1; add it in PR2 when the User model field exists. → D8 updated.
- **TEST-2**: Unit test the Cloud Function's URL extraction regex and Supabase update payload shape. → Added to Testability Notes Layer 1.
- **TEST-3**: Visual regression baseline (Playwright `toHaveScreenshot()`) for the 12 migrated call sites in PR1. → Added to Testability Notes Layer 3.
- **TEST-4**: Upload-race window testing requires Storage emulator + finalize delay to be deterministic. → Documented as a Layer 4 caveat with manual fallback.
- **INT-1**: Explicit `UserOptionalFields` placement for `profilePhotoThumbURL` and backward-compat in `isValidUserData`. → Added to D-new (model+cache section).
- **INT-2**: Notification mapper uses `profile_photo_thumb_url ?? profile_photo_url` (COALESCE), not silent replacement. → Added to D2/D-new.

### Minor

- Long-lived download URLs are an accepted tradeoff for public avatars (no revocation path).
- Backfill scripts: add row-count limits + production confirmation prompt.
- `cacheControl` literal extracted to `AVATAR_CACHE_CONTROL` const in a shared config file.
- `isValidUserData` carries a comment marking it as needing update when `User` shape changes.
- `MockCommentRow` carries an inline comment explaining the intentional non-use of `ComposedAvatar`.
- `apps/admin/` avatars remain out of scope; admin User type stays separate.

## Accepted Trade-offs

- **Functions runtime ownership**: This change introduces the first Cloud Function in the project. Accepted because the alternative (client-side polling) has worse failure modes.
- **Long-lived download URLs**: Avatars are public; no revocation needed. URL only rotates on upload.
- **Cross-cloud write coupling (Firebase Function → Supabase)**: New operational surface, documented. Accepted because the alternative (client-side resolution) is fragile.
- **Visual regression tooling**: Adds Playwright `toHaveScreenshot()` baseline as a new artifact in PR1. Accepted as the smallest viable check for 12-site refactor.
- **Notification COALESCE**: Mapper returns `thumb ?? original`, slight extra select cost. Accepted to avoid silent semantic shift in `fromUserProfileImage`.
- **No emulator-based Function test in initial PR**: Manual sandbox verification + unit-tested regex/payload is the minimum acceptable bar. Accepted to limit infra setup cost; can be added later.

## Revision History

- **Round 1** (2026-05-17): Five reviewers ran in parallel. Three Critical findings raised:
  - SEC-1 (Storage rules ownership gap)
  - QUAL-1 (no automated recovery)
  - TEST-1 (image-perf.spec.ts is a reporter not a gate)

  Plus 11 Important findings across the five lanes.

- **Round 2** (2026-05-17): design.md revised to address all three Critical and most Important findings:
  - Added Storage rule requirement (SEC-1) to D1 + Migration Plan as a precondition for PR2.
  - Added scheduled self-healing Function (QUAL-1) to D1.
  - Added concrete hard-assertion contract for `image-perf.spec.ts` (TEST-1) to D7 + Testability Notes.
  - Folded `cacheControl` setting into the same Cloud Function (QUAL-2) — D5 updated.
  - Removed `thumbSrc` from PR1; added in PR2 only (QUAL-3) — D8 updated.
  - Added unit-test contract for the Function's regex + payload (TEST-2) — Testability Notes Layer 1.
  - Added visual regression baseline (TEST-3) — Testability Notes Layer 3.
  - Added Storage emulator test approach for upload-race window (TEST-4) — Testability Notes Layer 4.
  - Added model field placement + cache validator backwards-compat (INT-1) — new D9.
  - Added notification COALESCE rule (INT-2) — D2 updated.
  - Added operational documentation (ARCH-1, ARCH-2, ARCH-3) — D1 + Risks.

  Remaining minor items documented as accepted trade-offs above.
