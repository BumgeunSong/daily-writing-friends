## 0. Validation

- [ ] 0.1 Create CDP IME helper (`tests/helpers/ime-helper.ts`) with `imeCompose()` function
- [ ] 0.2 Write a throwaway test that uses `imeCompose()` on the current Quill editor at `/create/test-board-1` to confirm the Korean IME line-break bug reproduces (paragraph count increases after typing Korean + `)`)
- [ ] 0.3 If bug does NOT reproduce via CDP, implement fallback: `page.evaluate` dispatching `CompositionEvent` directly on the editor DOM. Re-test.

## 1. HTML Fixtures

- [ ] 1.1 Create `tests/fixtures/editor-html-fixtures.ts` with 5 named fixture exports: `FIXTURE_ALL_FORMATS`, `FIXTURE_WITH_IMAGES`, `FIXTURE_KOREAN_MIXED`, `FIXTURE_EMPTY`, `FIXTURE_REAL_POST`
- [ ] 1.2 Write Vitest unit test (`tests/fixtures/editor-html-fixtures.test.ts`) validating each fixture parses without DOMParser errors

## 2. Editor Test Page

- [ ] 2.1 Create `apps/web/src/test/EditorTestPage.tsx` with `EditorTestHarness` component: renders PostEditor, provides `data-testid` attributes (`editor-area`, `editor-output`, `editor-container`), reads `?fixture=` URL param to pre-load content
- [ ] 2.2 Create `ToolbarProxy` within the test page that maps `data-testid="toolbar-bold"` etc. to the underlying editor's toolbar buttons via DOM query
- [ ] 2.3 Add `useEffect` in harness to find `[contenteditable="true"]` inside `editor-container` and set `data-testid="editor-area"` on it
- [ ] 2.4 Add dev-only route in `apps/web/src/router.tsx`: lazy import inside `import.meta.env.DEV` guard, path `/test/editor`
- [ ] 2.5 Manually verify: `pnpm dev` → navigate to `/test/editor` → editor renders, can type, output panel updates

## 3. E2E Suite: Text Formatting

- [ ] 3.1 Create `tests/editor-text-formatting.spec.ts` with tests for: bold (`<strong>`), italic (`<em>`), underline, strikethrough
- [ ] 3.2 Add tests for: heading 1 (`<h1>`), heading 2 (`<h2>`), blockquote
- [ ] 3.3 Add tests for: ordered list (`<ol>`), bullet list (`<ul>`)
- [ ] 3.4 Add test for: link insertion (`<a href>`)
- [ ] 3.5 Add test for: undo/redo preserves formatting

## 4. E2E Suite: Content Rendering + Compatibility

- [ ] 4.1 Create `tests/editor-content-rendering.spec.ts` with test: load `all-formats` fixture → verify visual rendering (headings, bold, links visible)
- [ ] 4.2 Add test: load `with-images` fixture → verify `<img>` tags visible
- [ ] 4.3 Add test: load `empty` fixture → verify placeholder shows
- [ ] 4.4 Add test: round-trip fidelity — load `all-formats` fixture, make no edits, compare output to input (normalized whitespace)
- [ ] 4.5 Add test: load `real-post` fixture → renders without errors, preserves semantic elements

## 5. E2E Suite: Image Upload (Mocked)

- [ ] 5.1 Create `tests/editor-image-upload-mock.spec.ts` with network mock setup (`page.route` for Supabase Storage endpoints)
- [ ] 5.2 Add test: toolbar image button → file select → mock upload → `<img>` in output
- [ ] 5.3 Add test: clipboard paste image → mock upload → `<img>` in output
- [ ] 5.4 Add test: drag and drop image → mock upload → `<img>` in output

## 6. E2E Suite: Paste + Undo/Redo

- [ ] 6.1 Create `tests/editor-paste-undo.spec.ts` with test: paste plain text → appears without formatting
- [ ] 6.2 Add test: paste formatted HTML → formatting preserved in output
- [ ] 6.3 Add test: type text → Ctrl+Z → text removed
- [ ] 6.4 Add test: undo → Ctrl+Shift+Z → text restored

## 7. E2E Suite: Mobile Viewport

- [ ] 7.1 Create `tests/editor-mobile.spec.ts` with mobile viewport configuration (Pixel 5)
- [ ] 7.2 Add test: editor renders and is scrollable at mobile viewport
- [ ] 7.3 Add test: mobile toolbar renders and is accessible
- [ ] 7.4 Add test: touch-tap formatting button → formatting applied
- [ ] 7.5 Add test: typing at mobile viewport → text appears correctly

## 8. E2E Suite: Korean IME

- [ ] 8.1 Create `tests/editor-korean-ime.spec.ts` using the validated CDP IME helper
- [ ] 8.2 Add tests: Korean + `)`, Korean + `/`, Korean + `...` → no unwanted line break (3 test cases)
- [ ] 8.3 Add tests: Korean + common punctuation (`.`, `,`, `!`, `?`, `"`, `'`) → no line break (6 test cases)
- [ ] 8.4 Add test: Korean syllable composition → correct text in output
- [ ] 8.5 Add test: Korean + Enter → exactly one new paragraph
- [ ] 8.6 Add test: mixed Korean/English → no break or corruption
- [ ] 8.7 Add test: rapid Korean/English alternation → no phantom line breaks
- [ ] 8.8 Add test: Korean text + bold formatting → `<strong>` wraps Korean text

## 9. Cleanup + CI

- [ ] 9.1 Run all 6 E2E suites against current Quill editor → all pass (except Korean IME line-break tests which should FAIL on Quill, confirming the bug)
- [ ] 9.2 Verify tests run in existing Playwright CI config (chromium, firefox, webkit, Mobile Chrome projects)
- [ ] 9.3 Document Korean IME Firefox/Safari known gap in test file comments
- [ ] 9.4 Commit all changes

## Tests

### Unit
- [ ] T.1 Vitest: HTML fixtures parse without DOMParser errors (task 1.2)
- [ ] T.2 Vitest: IME helper builds correct CDP commands for Korean text + commit char

### E2E
- [ ] T.3 Text formatting suite passes on Quill (task 3.1-3.5)
- [ ] T.4 Content rendering suite passes on Quill (task 4.1-4.5)
- [ ] T.5 Image upload mock suite passes on Quill (task 5.1-5.4)
- [ ] T.6 Paste + undo/redo suite passes on Quill (task 6.1-6.4)
- [ ] T.7 Mobile viewport suite passes on Quill (task 7.1-7.5)
- [ ] T.8 Korean IME suite: punctuation line-break tests FAIL on Quill (confirming the bug), all other tests pass (task 8.1-8.8)
