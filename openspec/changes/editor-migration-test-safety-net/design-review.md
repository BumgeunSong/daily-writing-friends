## Review Summary

**Status**: Ready (after revision)
**Iteration**: 2 of max 2

## Architecture

- **[Important] `data-testid` mapping unspecified** (architect): No `data-testid` attributes exist in PostEditor/PostTextEditor today. The test page wrapper must explicitly map testids to editor DOM elements. → **Addressed**: Design revised to specify a `EditorTestHarness` component that wraps PostEditor and maps `data-testid` to editor internals.
- **[Important] PostEditor interface gap for HTML loading** (architect): `value: string` vs `initialHtml` semantics differ between editors. → **Addressed**: Design revised to specify the test page manages PostEditor via controlled `value` prop for Quill, with an adapter layer for Tiptap during Phase 2.
- **[Minor] Route placement** (architect): Dev route fits naturally as a `devRoutes` block. No issue.
- **[Minor] CDP IME Chromium-only** (architect): Acceptable with documented fallback.

## Security

- **[Minor] Lazy import required** (security): Test page must be lazily imported inside `import.meta.env.DEV` guard for tree-shaking. → **Addressed**: Design revised to specify `React.lazy(() => import(...))`.
- **[Minor] XSS from fixtures** (security): Negligible — static strings, dev-only. No action needed.
- **[Minor] Data URL mock** (security): No issue.

## Quality

- **[Important] `imeCompose` helper needs validation** (quality): Must confirm it reproduces the Quill bug before building suites on it. → **Addressed**: Added as Task 0 (validation step).
- **[Important] image-upload.spec.ts migration contradicts keeping real uploads** (quality + integration): Moving to `/test/editor` loses real upload coverage. → **Addressed**: Design revised — keep original `image-upload.spec.ts` unchanged; add separate mock-upload suite on `/test/editor`.
- **[Minor] Suite overlap** (quality): Explicit ownership boundaries documented.
- **[Minor] URL param vs window.__setFixture** (quality): Accepted — URL params are simpler for Playwright navigation.

## Testability

- **[Critical → Fixed] CDP helper doesn't fire `compositionend`** (test-engineer): `imeSetComposition` + `insertText` skips the composition lifecycle. → **Addressed**: Design revised — helper uses `Input.dispatchKeyEvent` to properly end composition.
- **[Critical → Fixed] `editor-output` timing unspecified** (test-engineer): Rich text editors debounce onChange. → **Addressed**: Design revised — tests use `expect(locator).toHaveText()` with Playwright's auto-retry, plus explicit `waitFor` on output div content changes.
- **[Important] Paste normalization should have unit tests** (test-engineer): → **Accepted trade-off**: sanitizeHtml already has unit tests (`sanitizeHtml.test.ts`). Paste E2E tests cover the editor-specific paste handling.
- **[Important] Mobile suite lacks touch events** (test-engineer): → **Addressed**: Mobile suite uses `page.touchscreen.tap()` for toolbar interactions.
- **[Important] No round-trip fixture validation** (test-engineer): → **Addressed**: Content rendering suite includes explicit round-trip test (load → read → compare).
- **[Minor] `data-testid` on contenteditable ambiguity** (test-engineer): → **Addressed**: Specified in design — testid goes on the editable element itself.

## Integration

- **[Important] Interface mismatch PostEditor ↔ EditorTiptap** (code-reviewer): Different prop contracts. → **Addressed**: PostEditor's interface is the stable boundary. Phase 2 updates PostEditor internals to wrap EditorTiptap with an adapter. Tests go through PostEditor — the adapter is PostEditor's responsibility, not the test page's.
- **[Important] `onUploadingChange` missing from EditorTiptap** (code-reviewer): → **Noted for Phase 2**: Must be added to EditorTiptap before swap. Out of scope for Phase 1 (test infrastructure).
- **[Important] Mock upload layer differs per editor** (code-reviewer): → **Addressed**: Mock intercepts at Playwright network level (`page.route`), not at component level. Works regardless of which editor makes the upload request.
- **[Minor] Migrating image-upload.spec.ts loses routing coverage** (code-reviewer): → **Addressed**: Original file kept unchanged.

## Accepted Trade-offs

1. **Chromium-only CDP IME**: Firefox/Safari IME tests use basic `keyboard.type()` + manual verification. Documented as known gap.
2. **Paste normalization unit tests not added**: Existing `sanitizeHtml.test.ts` covers the pure function layer.
3. **URL params for fixtures**: Simpler than `window.__setFixture` for Playwright navigation.

## Revision History

- Round 1: 2026-04-22 — 2 critical, 7 important, 5 minor findings from 5 reviewers.
- Round 2: 2026-04-22 — Both critical findings fixed (CDP helper + assertion timing). 5 important findings addressed, 2 noted for Phase 2. Design revised. Status: Ready.
