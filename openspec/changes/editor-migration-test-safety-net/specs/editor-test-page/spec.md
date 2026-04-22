## ADDED Requirements

### Requirement: Dev-only editor test route
The app provides a `/test/editor` route available only in development builds (`import.meta.env.DEV`). The route is lazily imported so the test page module is excluded from production bundles.

#### Scenario: Route accessible in dev
- **WHEN** the app runs in development mode and navigates to `/test/editor`
- **THEN** the EditorTestHarness page renders with a functional PostEditor

#### Scenario: Route excluded from production
- **WHEN** the app is built for production
- **THEN** the `/test/editor` route and its component are not in the bundle

---

### Requirement: EditorTestHarness renders PostEditor
The test page renders `PostEditor` inside an `EditorTestHarness` wrapper. The harness provides `data-testid` attributes for editor-agnostic test interaction.

#### Scenario: Editor renders with empty content
- **WHEN** the test page loads without a fixture parameter
- **THEN** PostEditor renders with an empty editor and a placeholder

#### Scenario: Editor renders with fixture content
- **WHEN** the test page loads with `?fixture=all-formats`
- **THEN** PostEditor renders with the HTML from `FIXTURE_ALL_FORMATS` pre-loaded

#### Scenario: Available fixtures
- **WHEN** a test requests a fixture by name
- **THEN** the following fixtures are available: `all-formats`, `with-images`, `korean-mixed`, `empty`, `real-post`

---

### Requirement: Editor-agnostic data-testid attributes
The harness exposes interaction points via `data-testid` attributes that work regardless of the underlying editor (Quill or Tiptap).

#### Scenario: Editor area is clickable and focusable
- **WHEN** a test clicks `[data-testid="editor-area"]`
- **THEN** the contenteditable element receives focus and accepts keyboard input

#### Scenario: Toolbar buttons trigger formatting
- **WHEN** a test clicks `[data-testid="toolbar-bold"]`
- **THEN** the bold formatting command is applied to the editor's selection

#### Scenario: Toolbar testids available
- **WHEN** the test page renders
- **THEN** the following toolbar testids are available: `toolbar-bold`, `toolbar-italic`, `toolbar-underline`, `toolbar-strike`, `toolbar-h1`, `toolbar-h2`, `toolbar-blockquote`, `toolbar-ordered-list`, `toolbar-bullet-list`, `toolbar-link`, `toolbar-image`

---

### Requirement: Output panel reflects editor content
The harness renders a hidden `<div data-testid="editor-output">` that contains the current HTML output from PostEditor's `onChange`.

#### Scenario: Output updates after typing
- **WHEN** a user types text in the editor
- **THEN** `[data-testid="editor-output"]` innerHTML updates to reflect the new content (subject to onChange debounce)

#### Scenario: Output updates after formatting
- **WHEN** a user applies bold formatting to selected text
- **THEN** `[data-testid="editor-output"]` contains `<strong>` wrapping the selected text

---

### Requirement: Mock image upload via network interception
Image upload requests are mocked at the Playwright network level, not at the component level. The test page does not modify the editor's upload behavior.

#### Scenario: Toolbar image upload completes with mock
- **WHEN** a test intercepts `**/storage/v1/object/**` and a user selects an image via the toolbar
- **THEN** the upload resolves with a mock response and an `<img>` tag appears in the editor

#### Scenario: Mock works for both Quill and Tiptap
- **WHEN** the underlying editor changes from Quill to Tiptap
- **THEN** the network-level mock still intercepts the same Supabase Storage endpoint
