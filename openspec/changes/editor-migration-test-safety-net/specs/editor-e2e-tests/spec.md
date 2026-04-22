## ADDED Requirements

### Requirement: Text formatting test suite
Playwright E2E tests verify all toolbar formatting operations produce correct HTML output.

#### Scenario: Bold formatting
- **WHEN** a user types text, selects it, and clicks `[data-testid="toolbar-bold"]`
- **THEN** `[data-testid="editor-output"]` contains `<strong>` wrapping the selected text

#### Scenario: Italic formatting
- **WHEN** a user types text, selects it, and clicks `[data-testid="toolbar-italic"]`
- **THEN** `[data-testid="editor-output"]` contains `<em>` wrapping the selected text

#### Scenario: Heading formatting
- **WHEN** a user places cursor on a line and clicks `[data-testid="toolbar-h1"]`
- **THEN** `[data-testid="editor-output"]` contains `<h1>` wrapping that line

#### Scenario: List formatting
- **WHEN** a user clicks `[data-testid="toolbar-bullet-list"]`
- **THEN** `[data-testid="editor-output"]` contains `<ul><li>` structure

#### Scenario: Link insertion
- **WHEN** a user selects text and clicks `[data-testid="toolbar-link"]` and enters a URL
- **THEN** `[data-testid="editor-output"]` contains `<a href="...">` wrapping the selected text

#### Scenario: Undo/redo preserves formatting
- **WHEN** a user applies bold, then presses Ctrl+Z, then Ctrl+Shift+Z
- **THEN** formatting is removed then re-applied correctly

---

### Requirement: Content rendering and backward compatibility test suite
Playwright E2E tests verify pre-existing HTML content renders correctly and survives round-trips.

#### Scenario: All-formats fixture renders correctly
- **WHEN** the test page loads with `?fixture=all-formats`
- **THEN** the editor displays headings, bold, italic, lists, blockquotes, and links visually

#### Scenario: Images in content render
- **WHEN** the test page loads with `?fixture=with-images`
- **THEN** `<img>` tags are visible in the editor area

#### Scenario: Empty content shows placeholder
- **WHEN** the test page loads with `?fixture=empty`
- **THEN** the editor shows the placeholder text

#### Scenario: Round-trip fidelity
- **WHEN** a fixture is loaded and no edits are made
- **THEN** `[data-testid="editor-output"]` HTML matches the input fixture (after whitespace normalization)

#### Scenario: Real post backward compatibility
- **WHEN** the test page loads with `?fixture=real-post`
- **THEN** the editor renders without errors and output HTML preserves all semantic elements

---

### Requirement: Image upload test suite (mocked)
Playwright E2E tests verify image insertion via toolbar, paste, and drag-drop with mocked network.

#### Scenario: Toolbar image upload
- **WHEN** network is mocked and a user clicks `[data-testid="toolbar-image"]` and selects a file
- **THEN** an `<img>` tag with a valid `src` appears in `[data-testid="editor-output"]`

#### Scenario: Clipboard image paste
- **WHEN** network is mocked and a user pastes an image from clipboard
- **THEN** an `<img>` tag appears in `[data-testid="editor-output"]`

#### Scenario: Drag and drop image
- **WHEN** network is mocked and a user drops an image file onto the editor
- **THEN** an `<img>` tag appears in `[data-testid="editor-output"]`

---

### Requirement: Paste and undo/redo test suite
Playwright E2E tests verify clipboard paste behavior and history operations.

#### Scenario: Paste plain text
- **WHEN** a user pastes plain text from clipboard
- **THEN** the text appears in the editor without unwanted formatting

#### Scenario: Paste formatted HTML
- **WHEN** a user pastes HTML with bold/italic formatting
- **THEN** the formatting is preserved in `[data-testid="editor-output"]`

#### Scenario: Undo after typing
- **WHEN** a user types text and presses Ctrl+Z
- **THEN** the typed text is removed

#### Scenario: Redo after undo
- **WHEN** a user undoes an action and presses Ctrl+Shift+Z
- **THEN** the action is restored

---

### Requirement: Mobile viewport test suite
Playwright E2E tests verify editor behavior at mobile viewport size using touch events.

#### Scenario: Editor renders at mobile viewport
- **WHEN** the viewport is set to mobile size (e.g., Pixel 5)
- **THEN** the editor renders and is scrollable

#### Scenario: Mobile toolbar renders
- **WHEN** the viewport is mobile and the editor is focused
- **THEN** the toolbar is visible and accessible

#### Scenario: Touch formatting works
- **WHEN** a user selects text via touch and taps a formatting button
- **THEN** the formatting is applied correctly

#### Scenario: Typing at mobile viewport
- **WHEN** a user types text at mobile viewport
- **THEN** text appears correctly in the editor and output

---

### Requirement: Korean IME test suite
Playwright E2E tests verify Korean IME composition does not cause unwanted line breaks or corruption. Uses CDP `imeSetComposition` on Chromium.

#### Scenario: Korean + `)` does not create line break
- **WHEN** a user composes Korean text via IME and types `)`
- **THEN** the text and `)` appear on the same line with no unwanted paragraph break

#### Scenario: Korean + `/` does not create line break
- **WHEN** a user composes Korean text via IME and types `/`
- **THEN** the text and `/` appear on the same line

#### Scenario: Korean + `...` does not create line break
- **WHEN** a user composes Korean text via IME and types `...`
- **THEN** the text and `...` appear on the same line

#### Scenario: Korean + common punctuation stability
- **WHEN** a user composes Korean text and types `.`, `,`, `!`, `?`, `"`, `'`
- **THEN** no unwanted line breaks are created for any character

#### Scenario: Korean composition produces correct text
- **WHEN** a user composes Korean syllables (e.g., "가나다")
- **THEN** the correct Korean text appears in `[data-testid="editor-output"]`

#### Scenario: Korean + Enter creates exactly one paragraph
- **WHEN** a user composes Korean text and presses Enter
- **THEN** exactly one new paragraph is created

#### Scenario: Mixed Korean and English
- **WHEN** a user types Korean text then English text in the same paragraph
- **THEN** both appear on the same line with no break or corruption

#### Scenario: Rapid Korean/English alternation
- **WHEN** a user quickly alternates between Korean and English input
- **THEN** no phantom line breaks appear

#### Scenario: Korean text with bold formatting
- **WHEN** a user selects Korean text and applies bold
- **THEN** `<strong>` correctly wraps the Korean text
