## Review Summary

**Status**: Ready (Round 2 revisions applied; remaining items accepted)
**Iteration**: 2 of max 2

Three parallel reviewers (objectives-challenger, alternatives-explorer, user-advocate) hit strong convergence on widening the file picker's `accept` attribute, plus one independent Critical from user-advocate about the absence of a loading state during resize. All Critical items were addressed in Round 2; one Important (re-upload nudge for existing users) was accepted as a deliberate trade-off given app scale.

## Findings

### Critical

**C1. `accept='image/jpeg'` is unnecessarily strict.**
*(objectives-challenger + alternatives-explorer — 2 of 3 reviewers raised this independently)* iOS HEIC auto-conversion is triggered whenever `accept` does NOT include HEIC types, NOT only when it's JPEG-exclusive. `accept='image/jpeg,image/png'` preserves the HEIC guarantee (HEIC is still excluded) AND lets users select PNG screenshots / logos that they may legitimately want as avatars. Canvas pipeline normalizes both to JPEG output anyway. **Fix**: widen to `accept='image/jpeg,image/png'`. Update proposal.

**C2. No loading state during Canvas resize step.**
*(user-advocate)* On a mid-range Android phone, decoding + resizing a 10 MB photo can take 300–600 ms. If `resizeImageBlob` is called synchronously after file selection with no visual feedback, the UI appears frozen for that window. **Fix**: specify in the design that file selection immediately sets a "processing" state, button is disabled, and a spinner or "변환 중..." text appears in the avatar preview area. The state clears when the upload completes.

### Important

**I1. Android Chrome doesn't enforce `accept` MIME types.**
*(user-advocate)* Android Chrome's file picker shows all files; users can pick PNG, GIF, BMP, whatever. The Canvas pipeline normalizes to JPEG, so this works fine technically — but the proposal frames `accept` as a HEIC guard and says nothing about the broader input space. Define what happens for: (a) unsupported file types (Canvas decode fails) → clear inline error, (b) extremely large files (200 MB?) → either pre-check size before decode or rely on decode failure with friendly message.

**I2. No nudge mechanism for existing 46 users.**
*(user-advocate)* Existing avatars stay un-optimized until the user next updates their photo. Reviewer suggests an inline prompt on `EditAccountPage` for users whose avatar predates this change. → **Rejected as trade-off**: tracking "predates this change" requires either a new `users.profile_photo_optimized: boolean` column (schema cost we just avoided) or runtime file-size probing (latency cost). For 46 users with already-small originals (sampled 5–8 KB), the marginal cost of leaving existing avatars as-is is negligible. Documented in Accepted Trade-offs.

**I3. Header-only backfill (no re-encode) for `Cache-Control` on existing 46 files.**
*(objectives-challenger)* Existing files lack `Cache-Control` headers. A ~10-line `gsutil setmeta -h "Cache-Control:public, max-age=2592000"` script would close the gap cheaply (no re-encode). → **Accepted as optional follow-up task**, not a blocker. Added to design.md as a one-shot operational step.

### Minor

**M1. 256×256 output size.** Defensible per all reviewers. ~3-4× the largest current display (80 px @ 2x retina = 160 px). Power-of-two, future-proof.
**M2. JPEG quality 0.85.** Defensible per reviewers. Imperceptible at avatar sizes; conservative default.
**M3. JPEG vs WebP.** JPEG preferred — saves ~25-35% bytes via WebP but loses the iOS HEIC auto-conversion guarantee path, and the bytes are already negligible at avatar scale.
**M4. Multi-size vs single canonical.** Single 256 is correct.
**M5. Library vs hand-rolled Canvas.** ~20 lines is appropriate; libraries (browser-image-compression, pica) add 45–48 KB gzipped for no perceptible quality gain at this output size.
**M6. `OffscreenCanvas` primary / `HTMLCanvasElement` fallback.** Correct ordering; broad mobile WebView support.
**M7. JPEG re-encode quality loss for text/logo avatars.** Real but minor. Added one sentence to proposal Risk section.

## Key Questions Raised

1. Should `accept` allow PNG? **Yes — widened in Round 2.**
2. Is there a visible loading state during resize? **Yes — added to design contract.**
3. Should existing users be nudged to re-upload? **No — accepted trade-off given app scale.**
4. Should a header-only backfill be included? **Yes — added as optional operational step.**

## Alternatives Considered

| Alternative | Source | Status |
|---|---|---|
| `accept='image/jpeg,image/png'` (widen) | R1+R2 | **Adopted** in Round 2 |
| WebP output format | R2 | Rejected — marginal at avatar scale, loses HEIC conversion guarantee |
| Multi-size output | R2 | Rejected — single 256 covers all display contexts |
| Image library (browser-image-compression, pica) | R2 | Rejected — hand-rolled Canvas is sufficient |
| Schema flag for "this avatar is optimized" | R3 | Rejected — complexity > value at 46-user scale |
| Header-only metadata backfill (no re-encode) | R1 | **Adopted** as optional follow-up operational step |

## Accepted Trade-offs

- **Existing 46 users continue rendering un-optimized originals until their next photo update.** No nudge UI, no flag in DB. Given that sampled originals are 5–8 KB and the app has 46 users, the cumulative cost of "do nothing for existing users" is negligible (single-digit MB across all renders combined).
- **JPEG re-encode quality loss for screenshot/logo avatars at quality 0.85.** Acceptable for photo-avatar primary use case; documented in Risk.
- **Android Chrome picker shows all file types regardless of `accept`.** Defended by Canvas pipeline's universal normalization to JPEG output and a clear error message for decode failures.

## Revision History

- **Round 1** (2026-05-17): Three reviewers ran in parallel.
  - C1 (accept too strict): 2 of 3 reviewers raised independently
  - C2 (no loading state): user-advocate raised
  - Several Important + Minor items

- **Round 2** (2026-05-17): proposal.md updated:
  - Widened `accept` to `image/jpeg,image/png` (closes C1)
  - Added explicit loading-state contract for the resize step (closes C2 — also captured in design.md once that's authored)
  - Defined error-message paths for unsupported/oversized files (I1)
  - Added optional header-only `Cache-Control` backfill step (I3)
  - Added JPEG re-encode quality-loss note to Risk (M7)
  - Documented rejected alternatives in Accepted Trade-offs (I2, M3, M4, M5)

  All Critical findings addressed. Remaining items are accepted trade-offs or deferred follow-ups.
