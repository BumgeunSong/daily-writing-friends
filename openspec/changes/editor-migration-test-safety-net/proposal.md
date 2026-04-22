## Why

Typing `)`, `/`, or `...` in the Quill editor forces unwanted line breaks on PC. The root cause is a Korean IME composition bug in Quill 2.0.3's `batchEnd()` DOM reconciliation — the latest version, with no upstream fix.

### Why not patch Quill directly?

A targeted `compositionend` workaround was considered but rejected:

1. **The bug is in Quill's core mutation processing** (`composition.js` → `scroll.batchEnd()` → `ScrollBlot.update()`). Monkey-patching would require intercepting Quill's internal MutationObserver batch, which is not exposed in the public API.
2. **Browser-specific timing**: The `compositionend` event order differs between Chrome, Firefox, and Safari. A patch that fixes Chrome/Windows may break Safari or Firefox.
3. **Fragile maintenance**: Any Quill update could break a monkey-patch, and Quill 2.x development is slow (only 3 patch releases since 2.0.0).
4. **Tiptap already exists**: The codebase has a complete (but unwired) Tiptap editor with the same features. Tiptap/ProseMirror handles Korean IME correctly because it processes composition at a higher abstraction level.

### Competing proposal context

`openspec/changes/remove-tiptap-dead-code/` proposed deleting the Tiptap code, written when the team intended to stay with Quill. The discovery of this unfixable IME bug reverses that decision. The removal proposal should be abandoned in favor of migration.

### Why not migrate without tests?

A previous Tiptap migration was rolled back because bugs in formatting, content rendering, image upload, and mobile behavior slipped through. We need a test safety net before migrating again.

## What Changes

- Add a dev-only `/test/editor` route (guarded by `import.meta.env.DEV`) that renders `PostEditor` in isolation with mocked image upload
- Add 6 Playwright E2E test suites: text formatting, content rendering (including existing post HTML compatibility), image upload (mocked), paste and undo/redo, mobile behavior, and Korean IME
- Migrate existing `image-upload.spec.ts` Quill-specific selectors to editor-agnostic selectors
- All tests interact through `PostEditor`'s public interface and `data-testid` attributes — never through editor-internal selectors like `.ql-editor` or `.ProseMirror`
- Korean IME tests use Chromium CDP `Input.imeSetComposition` / `Input.insertText` for realistic composition simulation, with a fallback note that full cross-browser IME testing requires manual verification
- No production behavior changes

## Capabilities

### New Capabilities
- `editor-test-page`: Dev-only isolated route (`/test/editor`) rendering `PostEditor` with HTML fixtures, mock image upload, and a `data-testid="editor-output"` panel. The test page wraps `PostEditor` with the same props interface regardless of underlying editor, abstracting the `value`/`initialHtml` mismatch.
- `editor-e2e-tests`: Six Playwright test suites (text formatting, content rendering + compatibility, mocked image upload, paste + undo/redo, mobile viewport, Korean IME) using editor-agnostic selectors. Replaces Quill-specific selectors in existing `image-upload.spec.ts`.

### Modified Capabilities
<!-- No existing specs to modify — all new test infrastructure -->

## Impact

- **New files**: Test page component, 6 Playwright spec files, HTML fixture data (including real post HTML samples), editor test utilities, CDP IME helper
- **Modified files**: `router.tsx` (add dev-only route), `image-upload.spec.ts` (migrate selectors)
- **Dependencies**: No new dependencies. Uses existing Playwright setup.
- **CI**: New test suites run in existing Playwright CI projects (chromium, firefox, webkit, Mobile Chrome). No additional configuration needed.
- **Risk**: Zero production risk — all changes are dev/test-only
