## Context

The Quill 2.0.3 editor has an unfixable Korean IME composition bug that forces line breaks when typing `)`, `/`, `...` on PC. A complete Tiptap editor exists in the codebase but isn't wired up. A previous migration attempt failed because bugs in formatting, content rendering, image upload, and mobile behavior went undetected.

This design covers the test infrastructure needed before attempting migration again: an isolated editor test page and 6 E2E test suites.

**Current architecture:**
- `PostCreationPage` / `PostEditPage` / `PostFreewritingPage` → `PostEditor` → `PostTextEditor` (Quill)
- `PostEditor` interface: `value: string`, `onChange: (value: string) => void`, `placeholder?: string`, `onUploadingChange?: (isUploading: boolean) => void`
- Existing E2E: `tests/image-upload.spec.ts` uses Quill-specific selectors (`.ql-editor`, `.ql-toolbar .ql-image`)
- Playwright config: chromium, firefox, webkit, Mobile Chrome projects with Supabase auth fixtures

## Goals / Non-Goals

**Goals:**
- Build an isolated test page that renders `PostEditor` without auth or server dependencies
- Write 6 E2E test suites covering the 4 failure areas from the previous migration + Korean IME + paste/undo
- All tests use editor-agnostic selectors that work with both Quill and Tiptap
- Korean IME tests use CDP for realistic composition simulation on Chromium
- Validate that the CDP IME helper reproduces the known Quill bug before building suites on it

**Non-Goals:**
- Swapping the editor (Phase 2 — separate change)
- Feature flag implementation (Phase 2)
- Unit tests for editor internals (editor libraries are third-party)
- Modifying existing `image-upload.spec.ts` (keep it unchanged for real Supabase upload coverage)

## Decisions

### 1. Test page as a dev-only route with lazy import

**Decision:** Dev-only route at `/test/editor`, guarded by `import.meta.env.DEV`, with lazy import.

```typescript
// In router.tsx
const devRoutes = import.meta.env.DEV ? {
  path: 'test',
  children: [
    { path: 'editor', lazy: () => import('@/test/EditorTestPage') },
  ],
} : null;
```

**Why:** `import.meta.env.DEV` is tree-shaken by Vite in production. Lazy import ensures the test page module is fully excluded from production bundles (not just unreachable). This pattern already exists in the codebase (`remote-config.ts`, `sentry.ts`).

### 2. EditorTestHarness — the test page abstraction

**Decision:** The test page uses an `EditorTestHarness` component that wraps `PostEditor` and provides the `data-testid` mapping layer.

```tsx
function EditorTestHarness({ initialHtml, fixture }: Props) {
  const [content, setContent] = useState(initialHtml ?? '');

  return (
    <div>
      {/* Toolbar wrapper — maps data-testid to editor toolbar buttons */}
      <div data-testid="toolbar-area">
        {/* data-testid="toolbar-bold", "toolbar-italic", etc.
            These are thin wrappers that find and click the underlying
            editor's toolbar buttons via DOM query */}
      </div>

      {/* Editor — PostEditor rendered normally */}
      <div data-testid="editor-container">
        <PostEditor
          value={content}
          onChange={setContent}
          placeholder="테스트 에디터..."
        />
      </div>

      {/* Output panel — reflects current HTML for assertions */}
      <div data-testid="editor-output" style={{ display: 'none' }}>
        {content}
      </div>
    </div>
  );
}
```

**Key details:**
- `data-testid="editor-area"` is applied to the actual contenteditable element via a `useEffect` that finds `[contenteditable="true"]` inside the container and sets the attribute
- Toolbar testids are mapped via a `ToolbarProxy` component that queries the underlying editor's toolbar buttons and provides `data-testid` wrappers
- The `editor-output` div is hidden but readable by Playwright for content assertions
- Tests use Playwright's auto-retrying `expect(locator).toHaveText()` / `toContainText()` to handle debounced `onChange` — no manual timing

**Why:** This approach keeps `PostEditor` untouched. The harness is the only file that knows about editor internals. During Phase 2 (Tiptap swap), only the harness's toolbar mapping needs updating.

### 3. Editor-agnostic selectors strategy

Tests interact with the editor through 3 channels only:
1. **Typing**: Click `[data-testid="editor-area"]` (the contenteditable element) then use `page.keyboard`
2. **Toolbar**: Click `[data-testid="toolbar-bold"]`, `[data-testid="toolbar-image"]`, etc.
3. **Output**: Read `[data-testid="editor-output"]` innerHTML for assertions

**Suite ownership boundaries:**
| Suite | Owns | Does not test |
|---|---|---|
| Text formatting | Toolbar-initiated formatting, headings, lists | Paste, IME |
| Content rendering | Fixture loading, round-trip, backward compat | Typing new content |
| Image upload (mock) | Toolbar/paste/drag-drop image insertion | Real upload pipeline |
| Paste + undo/redo | Clipboard paste, undo/redo history | Toolbar formatting |
| Mobile | Mobile viewport, touch toolbar, scroll | Desktop-only features |
| Korean IME | CDP composition, punctuation after Korean | Toolbar formatting |

### 4. Korean IME simulation — validated CDP approach

**Decision:** Use Chromium CDP protocol with proper composition lifecycle events. **Validate that the helper reproduces the Quill bug as Task 0 before writing the full suite.**

**CDP helper (revised to fire composition lifecycle):**
```typescript
async function imeCompose(page: Page, composingText: string, commitChar: string) {
  const client = await page.context().newCDPSession(page);

  // 1. Start composition
  await client.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key: 'Process', code: '', windowsVirtualKeyCode: 229
  });
  await client.send('Input.imeSetComposition', {
    selectionStart: 0, selectionEnd: 0, text: composingText
  });

  // 2. Commit composition (compositionend fires)
  await client.send('Input.insertText', { text: composingText });

  // 3. Type the triggering character (e.g., ')', '/', '.')
  await client.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key: commitChar, code: `Key${commitChar.toUpperCase()}`
  });
  await client.send('Input.insertText', { text: commitChar });

  await client.detach();
}
```

**Task 0 validation:** Before writing the full IME suite, run the helper against the current Quill editor and assert that:
1. The bug reproduces (unwanted line break appears)
2. Paragraph count increases after typing Korean + `)` 

If the helper does NOT reproduce the bug, fall back to a simpler approach: use `page.evaluate` to directly dispatch `CompositionEvent` on the editor DOM.

**Trade-off:** CDP is Chromium-only. Firefox/Safari IME coverage is a documented known gap, flagged for manual verification.

### 5. HTML fixtures for content rendering

A TypeScript fixtures file exports named HTML strings:

- `FIXTURE_ALL_FORMATS`: headings, bold, italic, underline, strike, lists, blockquote, link
- `FIXTURE_WITH_IMAGES`: paragraphs with inline `<img>` tags (using data URLs)
- `FIXTURE_KOREAN_MIXED`: Korean + English + punctuation + special chars
- `FIXTURE_EMPTY`: empty string
- `FIXTURE_REAL_POST`: Actual production post HTML (sanitized of PII) for backward compatibility

**Round-trip fidelity test:** Content rendering suite includes: load fixture → type nothing → read output → normalize whitespace → compare to input. Any rendering difference is a test failure.

### 6. Existing image-upload.spec.ts — keep unchanged

**Decision:** Keep the original `image-upload.spec.ts` completely unchanged. It tests the real Supabase upload pipeline with auth context. Add a separate mock-upload suite (`editor-image-upload.spec.ts`) on the `/test/editor` route.

**Why:** The original file tests a different thing (Supabase Storage integration) than the new suite (editor image insertion behavior). Migrating its selectors would lose real-app routing and auth coverage. During Phase 2, the original file's Quill-specific selectors will need updating — but that belongs in the migration change, not this one.

### 7. Mock image upload via network interception

**Decision:** Mock image uploads at the Playwright network level using `page.route()`, not at the component level.

```typescript
await page.route('**/storage/v1/object/**', route =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ Key: 'test/mock-image.jpg' })
  })
);
// Also mock the public URL fetch
await page.route('**/storage/v1/object/public/**', route =>
  route.fulfill({
    status: 200,
    contentType: 'image/jpeg',
    body: Buffer.from('fake-image-data')
  })
);
```

**Why:** Network-level mocking works regardless of which editor makes the upload request. No component-level changes needed. Both Quill's `useImageUpload` and Tiptap's `useTiptapImageUpload` hit the same Supabase Storage endpoint.

### 8. Mobile suite with touch events

**Decision:** Mobile tests use `page.touchscreen.tap()` for toolbar interactions, not mouse clicks.

**Why:** Mobile toolbar behavior differs between editors. Tiptap may use a bubble menu that requires touch positioning. Using `page.touchscreen` ensures the tests validate real mobile interaction patterns.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| CDP `imeSetComposition` may not match OS-level IME | Task 0 validates bug reproduction before full suite. Fallback: `page.evaluate` with CompositionEvent dispatch. |
| EditorTestHarness toolbar mapping is editor-specific | Only this one file changes during Phase 2. Explicitly documented. |
| Mock image upload doesn't test real upload pipeline | Unchanged `image-upload.spec.ts` covers real uploads with Supabase. |
| `import.meta.env.DEV` route in dev builds | Lazy import + Vite tree-shaking eliminates from production. |
| Firefox/Safari IME tests are best-effort | Documented known gap. Manual verification checklist in test file. |
| Debounced onChange causes assertion timing issues | Playwright's auto-retrying `expect()` matchers handle this. |

## Testability Notes

### Unit (Layer 1)
- **HTML fixture validation**: Vitest test that each fixture parses without DOMParser errors
- **IME helper command builder**: Pure function tests for CDP command generation

### Integration (Layer 2)
- Not applicable — this change is test infrastructure

### E2E Network Passthrough (Layer 3)
All 6 suites are Layer 3 E2E tests using Playwright:

1. **Text formatting** — type, select, format via toolbar, assert output HTML tags
2. **Content rendering + compatibility** — load fixtures, verify rendering, round-trip fidelity
3. **Image upload (mocked)** — toolbar/paste/drag-drop → network-mocked upload → image in output
4. **Paste + undo/redo** — paste external HTML, undo/redo formatting changes
5. **Mobile viewport** — touch interactions, mobile toolbar position, scrollability
6. **Korean IME** — CDP composition simulation, punctuation after Korean, mixed input

### E2E Local DB (Layer 4)
- Not applicable. Real Supabase upload tests are in the existing `image-upload.spec.ts`.
