# Editor Migration: Quill to Tiptap — Test Safety Net

## Problem

Typing `)`, `/`, `...` in the Quill editor forces line breaks on PC. Root cause: Quill 2.0.3's `composition.js` mishandles Korean IME `compositionend` events during `batchEnd()` DOM reconciliation. Quill 2.0.3 is the latest version; no upstream fix exists.

A previous Tiptap migration attempt was rolled back because bugs in formatting, content rendering, image upload, and mobile behavior slipped through without test coverage.

## Strategy

Build a test safety net before migrating. Two-phase approach:

1. **Phase 1** — Write E2E tests against current Quill editor. All green.
2. **Phase 2** — Swap to Tiptap. Fix failures until all green. Roll out behind feature flag.

## Phase 1: Test Infrastructure

### Isolated Test Page

A dev-only route at `/test/editor` that renders `PostEditor` with no server dependencies.

- Renders the same `PostEditor` component used in production
- Pre-loads HTML fixtures covering all format types (headings, bold, italic, links, images, lists, blockquotes)
- Mocks image upload to return a placeholder data URL instantly
- Exposes a `<div data-testid="editor-output">` reflecting current HTML output for assertion
- Works identically for both Quill and Tiptap — tests never reference editor internals

### E2E Test Suites

Five Playwright test files using editor-agnostic selectors:

**`editor-text-formatting.spec.ts`**
- Apply bold, italic, underline, strikethrough → verify output HTML tags
- Apply heading 1, heading 2
- Create bulleted list, ordered list, blockquote
- Insert link via toolbar
- Undo/redo preserves formatting

**`editor-content-rendering.spec.ts`**
- Load pre-existing HTML with all format types → verify editor displays correctly
- Load content with images → verify `<img>` tags render
- Load content with links → verify links visible
- Load empty content → verify placeholder shows
- Type then read output → verify roundtrip fidelity
- Load content, make no changes → verify output matches input (no corruption)

**`editor-image-upload.spec.ts`** (mocked)
- Toolbar button → file select → mock upload → image appears
- Clipboard paste → mock upload → image appears
- Drag and drop → mock upload → image appears
- Verify uploaded image has valid `src` in output

**`editor-mobile.spec.ts`**
- Core tests (typing, formatting, content rendering) at mobile viewport
- Mobile toolbar renders at bottom
- Editor is scrollable and focusable

**`editor-korean-ime.spec.ts`**
- Type Korean + `)`, `/`, `...`, `.`, `,`, `!`, `?`, `"`, `'` → no unwanted line break
- Type Korean syllables → correct text in output
- Korean + space + Korean → single paragraph
- Korean + Enter → exactly one new paragraph
- Korean + backspace during composition → character deleted
- Korean then English mid-sentence → no break or corruption
- English then Korean → same
- Korean text + bold formatting → formatting preserved
- Fast alternating Korean/English → no phantom line breaks
- Korean + multiple special chars in sequence → stable

## Phase 2: Migration Deployment

### Editor Swap

1. Switch `PostEditor` from `PostTextEditor` (Quill) to `EditorTiptap` (Tiptap)
2. Add `onUploadingChange` prop to `EditorTiptap`
3. Run all 5 E2E suites → fix failures until green

### Feature Flag Rollout

- `editor_version`: `"quill"` | `"tiptap"` via Firebase Remote Config
- `PostEditor.tsx` reads the flag and renders the appropriate editor
- Gradual rollout: 10% → 50% → 100%
- Instant rollback by flipping the flag — no redeploy

### Rollback Safety

- Both editors read/write HTML — no data migration needed
- Feature flag gives instant rollback without code changes
- Keep Quill code for 2 weeks after 100% rollout, then remove
