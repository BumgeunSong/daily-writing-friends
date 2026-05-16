## Review Summary

**Status**: Ready (Round 2 revisions applied; remaining items deferred to design.md or accepted)
**Iteration**: 2 of max 2

Three parallel reviewers (objectives-challenger, alternatives-explorer, user-advocate) flagged overlapping concerns: the proposal may be over-scoped relative to the measured pain, and it leaves cross-device staleness + upload-race UX behavior under-specified.

## Findings

### Critical

**C1. "Most-frequently-rendered asset" claim is unvalidated.**
*(objectives-challenger)* The proposal asserts avatars are the most-rendered asset and uses it to justify the work. In a writing app, `postImages/` likely dominate bandwidth (one feed page = N posts × possibly multiple images vs. one avatar per post). No measurement is cited. If post images are the bigger fish, this work optimizes the smaller one — and the same Cache-Control fix would apply there for nearly zero incremental cost.

**C2. Stale avatar on OTHER devices after re-upload.**
*(user-advocate)* If `Cache-Control: max-age=2592000` (30d) is set, the uploader sees their new face immediately, but every colleague who already has the old URL cached sees the *old* face for up to 30 days. Re-uploads are the primary reason people change avatars (rebranding, embarrassing photo). The proposal asserts "re-uploads change the URL token → naturally invalidated", but the invalidation chain (Supabase row update → `useUser` cache refresh on other devices → fresh URL → fresh bytes) is not made explicit, and its real bound is the 24h `userCache.ts` TTL — not the 30d HTTP cache. **This must be made explicit or the 30d TTL is a social UX defect.**

**C3. Layer B alone may capture ~80% of the value.**
*(objectives-challenger + alternatives-explorer)* B (Cache-Control on uploads) is a one-line change with one backfill script. It eliminates the cross-session re-fetch — the stated pain point. A is code-quality hygiene; C optimizes only the first-visit swap race. Reviewers argue: ship B alone first, measure, then decide if A and C are justified. The proposal couples them in a single stack without quantifying each layer's marginal contribution.

**C4. Upload-time polling for `_128x128` is a fragile race.**
*(alternatives-explorer)* The proposal commits to "persist thumb URL at upload time" but leaves resolution to design.md. The reviewer surfaces a strictly-better alternative: a Cloud Function `object.finalize` trigger on `profilePhotos/*_128x128.*` writes the URL to Supabase reactively. This eliminates client-side polling/timeout/race entirely. **This is a design decision, not a proposal decision, but the proposal should at least call out the alternative.**

### Important

**I1. Real user pain is unquantified.**
*(objectives-challenger + alternatives-explorer)* No baseline LCP, repeat-visit bandwidth, or `tests/image-perf.spec.ts` numbers are cited. For a small Korean writing community on reasonable connections, the perceived gain may be small. The proposal should commit to a measurement step before/after each layer.

**I2. C introduces schema coupling for a render-time problem.**
*(objectives-challenger)* Adding `profile_photo_thumb_url` to Supabase means every avatar URL change becomes a dual-write, and we now permanently maintain a derived value. If B alone is sufficient, this complexity is unjustified.

**I3. Upload race window — user sees their own avatar slowest right after uploading.**
*(user-advocate)* When upload completes but the resize extension hasn't yet written `_128x128`, the proposal's "fall back to original URL" means the just-uploaded user sees a 5MB original load while everyone else's avatars use the cached thumb — the worst possible UX moment. The fallback behavior must be defined (local object URL? block briefly?).

**I4. EditAccountPage live preview during upload.**
*(user-advocate)* The page shows the user's own avatar live as they upload. `ComposedAvatar` will prefer `profilePhotoThumbURL` from the user model, which is not yet updated mid-upload. Without explicit handling, the user sees a blank circle and perceives the upload as broken.

### Minor

**M1. Layer A is hygiene; bundling it with caching conflates motivations.**
*(objectives-challenger)* Routing 12 sites through `ComposedAvatar` is a code-quality refactor. It could ship independently and earlier.

**M2. Post-image caching is deferred despite using the same infrastructure.**
*(objectives-challenger)* `Cache-Control` for `postImages/` is the same one-line change for likely higher bandwidth value.

**M3. No-avatar fallback consistency across 12 call sites.**
*(user-advocate)* `AvatarFallback` renders initials; the proposal doesn't confirm all 12 sites pass a consistent fallback. Silent regression risk for accounts without avatars (most new users).

**M4. Perceived-load win is strongest in long comment threads, not page load.**
*(user-advocate)* The proposal frames the value broadly; implementation priority should reflect that comment threads (many avatars at once, double-fetch race most painful) are the highest-leverage surface.

**M5. Signed-URL token can't be derived client-side from the original URL token.**
*(alternatives-explorer)* Confirms a constraint — server-side resolution is required for C; strengthens the case for a Cloud Function trigger over upload-time client polling.

## Key Questions Raised

1. **Is the win measurable?** Without a baseline LCP/transfer report from `tests/image-perf.spec.ts`, we can't tell which layer (A, B, or C) actually moves the needle.
2. **Is C worth the schema cost?** If B alone delivers most of the value, C may be premature optimization with a permanent maintenance tail.
3. **Is upload-time client polling acceptable, or should we use a Cloud Function `object.finalize` trigger?** (Design-phase question.)
4. **What's the user-perceived staleness window after a re-upload, on other devices?** Currently bounded by 24h user-cache TTL; must be stated explicitly.

## Alternatives Considered

| Alternative | Reviewer | Status |
|---|---|---|
| Ship B alone first; measure; then decide on A/C | R1 + R2 | **Surface back to user** — contradicts existing decision |
| Cloud Function `object.finalize` trigger instead of upload-time polling | R2 | **Defer to design.md** — appropriate level |
| Extend Cache-Control to `postImages/` in the same change | R1 | **Defer** — out of scope but cheap follow-up |
| Do nothing | R2 | Rejected — degradation is real but gradual; this work is preventative |

## Accepted Trade-offs

- **A+C+B stack vs B-alone (C3)**: User explicitly confirmed A+C+B after seeing reviewer pushback. Mitigation: a measurement gate is added between each PR — a layer that fails to move the needle in `image-perf.spec.ts` must be re-justified or dropped before merging the next.
- **30-day Cache-Control TTL vs shorter (C2)**: Accepted. Effective cross-device staleness is bounded by the 24 h `userCache.ts` TTL, not the 30 d HTTP cache TTL. Now documented explicitly in proposal.md ("Cross-device staleness chain").
- **No content-hashed paths**: Rejected; the 24 h bound is acceptable and content-hashed paths break the existing single-path-per-user invariant.
- **Cloud Function trigger vs upload-time polling (C4)**: Deferred to design.md. Both approaches noted in proposal.md; design phase picks the concrete approach.
- **Post-image caching (M2)**: Acknowledged in proposal.md "Out of scope" as a worthwhile follow-up after B ships.

## Revision History

- **Round 1** (2026-05-17): Initial review. Three Critical findings raised:
  - C1: Validate the "most-rendered asset" framing or rephrase
  - C2: Make the cross-device staleness chain explicit
  - C3: Reviewers push for B-alone first → surfaced to user
  - C4: Note Cloud Function trigger as design-phase alternative

- **Round 2** (2026-05-17): User confirmed A+C+B with measurement gate; user confirmed 24 h staleness bound is acceptable. proposal.md updated to:
  - Soften the "most-rendered asset" framing to "rendered on nearly every social surface" (addresses C1)
  - Add explicit cross-device staleness chain documentation (addresses C2)
  - Add "Why not B alone?" section + per-layer measurement gates (addresses C3, I1, I2)
  - Note Cloud Function trigger as an alternative deferred to design.md (addresses C4)
  - Add upload-race fallback contract (addresses I3, I4); detailed strategy deferred to design.md
  - Add fallback-consistency requirement to Layer A (addresses M3)
  - Mark `MockCommentRow` explicitly out of scope; note `postImages/` as a follow-up (addresses M2)
  - Add an explicit "Measurement Plan" section (addresses I1)

  All Critical and most Important findings addressed. Remaining items are design-phase concerns or accepted trade-offs.
