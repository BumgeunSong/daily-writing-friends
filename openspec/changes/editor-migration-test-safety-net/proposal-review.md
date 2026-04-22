## Review Summary

**Status**: Ready
**Iteration**: 2 of max 2

## Findings

### Critical

All critical findings from Round 1 have been addressed:

1. ~~Missing investigation of direct Quill patch~~ — **Addressed**: Proposal now explicitly documents why a `compositionend` monkey-patch was rejected (internal API, browser-specific timing, fragile maintenance, Tiptap already available).
2. ~~Contradictory proposals~~ — **Addressed**: Proposal states that the IME bug reverses the decision to stay with Quill; the `remove-tiptap-dead-code` proposal should be abandoned.
3. ~~Existing post content compatibility~~ — **Addressed**: Content rendering suite now explicitly includes existing post HTML compatibility testing.
4. ~~Existing image-upload.spec.ts conflict~~ — **Addressed**: Proposal includes migrating existing Quill-specific selectors to editor-agnostic selectors.

### Important

5. ~~Playwright IME simulation limitations~~ — **Addressed**: Proposal specifies Chromium CDP `Input.imeSetComposition` for realistic composition simulation, with a fallback note that cross-browser IME testing requires manual verification.
6. ~~"Editor-agnostic selectors" undefined~~ — **Addressed**: Proposal clarifies the test page wraps `PostEditor` with consistent props, abstracting the value/initialHtml mismatch. Tests interact through `data-testid` attributes only.
7. ~~Missing paste and undo/redo tests~~ — **Addressed**: Added as a 6th test suite (paste + undo/redo).
8. ~~Proportionality~~ — **Accepted trade-off**: The proposal now explicitly states this is about migration, not just a bug fix. The test investment is justified because a previous migration without tests failed.

### Minor

9. ~~Dev route guard~~ — **Addressed**: Guarded by `import.meta.env.DEV`.
10. ~~No CI integration plan~~ — **Addressed**: Runs in existing Playwright CI projects.
11. Mobile keyboard dismiss — **Accepted**: Flagged for manual verification; automated coverage limited.

## Key Questions Raised

1. ~~Has a direct Quill patch been attempted?~~ → Investigated and rejected with documented rationale.
2. ~~Is the team committed to Tiptap migration?~~ → Yes, the IME bug reverses the prior decision to keep Quill.
3. ~~How will Korean IME composition be simulated?~~ → CDP `Input.imeSetComposition` + manual verification fallback.
4. ~~What happens to existing posts?~~ → HTML format is shared; content rendering compatibility tests added.

## Alternatives Considered

| Alternative | Verdict | Reasoning |
|---|---|---|
| Do nothing | Rejected | Korean IME is primary input; bug breaks core writing experience |
| Direct Quill patch | Rejected | Internal API, browser-specific timing, fragile; Tiptap exists |
| Migrate without tests | Rejected | Already failed once |
| Tests first, then migrate | **Approved** | Addresses root cause with safety net |

## Accepted Trade-offs

- **Playwright IME tests are Chrome-only for realistic composition**: CDP `imeSetComposition` is Chromium-specific. Firefox/Safari IME tests rely on `page.keyboard` (less accurate) + manual verification.
- **Mobile IME (Samsung/Gboard Korean) requires manual verification**: Automated Playwright mobile tests use viewport emulation, not real device IME.
- **Test investment is front-loaded**: 6 E2E suites is significant upfront work, justified by preventing another failed migration.

## Revision History

- Round 1: 2026-04-22 — Initial review. 4 critical, 4 important, 3 minor findings.
- Round 2: 2026-04-22 — Proposal revised to address all critical and important findings. All 4 critical issues resolved. 3 important issues resolved, 1 accepted as trade-off. 2 minor issues resolved, 1 accepted. Status: Ready.
