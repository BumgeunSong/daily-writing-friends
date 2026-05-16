## ADDED Requirements

### Requirement: Remove Quill Editor Dependency and Components

The web app SHALL remove the `react-quill-new` dependency and all Quill-specific editor code paths so that Tiptap is the only post editor implementation shipped to clients.

#### Scenario: react-quill-new package removed
- **WHEN** `apps/web/package.json` is inspected after the change
- **THEN** the file MUST NOT list `react-quill-new` under `dependencies` or `devDependencies`
- **AND** `pnpm install` MUST succeed without referencing the package

#### Scenario: PostTextEditor component deleted
- **WHEN** the repository is searched for `PostTextEditor.tsx` under `apps/web/src/post/components/`
- **THEN** no such file MUST exist
- **AND** no other module MUST import a symbol named `PostTextEditor`

#### Scenario: PostEditor renders Tiptap directly
- **WHEN** `<PostEditor>` is mounted in any caller
- **THEN** it MUST render the Tiptap editor without consulting `tiptap_editor_enabled` or any `forceEditor` prop
- **AND** the `lockedEditorRef` switching logic MUST be removed

#### Scenario: useImageUpload hook and tests deleted
- **WHEN** `apps/web/src/post/hooks/useImageUpload.ts` and `apps/web/src/post/hooks/__tests__/useImageUpload.test.ts` are searched for
- **THEN** neither file MUST exist
- **AND** no source file under `apps/web/src/` MUST import `useImageUpload`

#### Scenario: EditorTestPage Quill branches stripped
- **WHEN** `apps/web/src/test/EditorTestPage.tsx` is inspected
- **THEN** all branches that select or render the Quill editor MUST be removed
- **AND** only Tiptap rendering paths MUST remain

### Requirement: Preserve Tiptap Image-Paste Pipeline

The change SHALL leave Tiptap's image-paste and image-drop pipeline untouched, so that pasting or dropping an image into a Tiptap post continues to route the file through Supabase Storage upload instead of inlining base64 into the post HTML.

#### Scenario: Tiptap image-paste continues to upload to Supabase Storage
- **WHEN** an image is pasted into a Tiptap-mounted `<PostEditor>`
- **THEN** `EditorTiptap`'s capture-phase paste handler (wired through `useTiptapImageUpload`) MUST intercept the clipboard data, upload the file to Supabase Storage, and insert the resulting URL into the editor
- **AND** the post HTML MUST NOT contain a base64 data URL

#### Scenario: useTiptapImageUpload and EditorTiptap untouched
- **WHEN** `apps/web/src/post/hooks/useTiptapImageUpload.ts` and `apps/web/src/post/components/EditorTiptap.tsx` are inspected after the change
- **THEN** their behavior MUST be functionally unchanged by this proposal
- **AND** no edits to these files are required by the Quill removal scope

#### Scenario: Stale comment about useImageUpload reframed
- **WHEN** `apps/web/src/post/utils/sanitizeHtml.ts` is inspected after the change
- **THEN** any comment referencing `useImageUpload` as the source of a shared pattern MUST be rewritten so it does not point to the deleted file

### Requirement: Preserve Legacy Quill Content Rendering

The change SHALL preserve all read paths that render historical posts stored as Quill HTML, so that posts created before the Tiptap rollout continue to display correctly.

#### Scenario: convertQuillBulletLists kept intact
- **WHEN** `apps/web/src/post/utils/contentUtils.ts` (or the file currently hosting `convertQuillBulletLists`) is inspected
- **THEN** the `convertQuillBulletLists` function MUST remain exported with unchanged behavior
- **AND** the DOMPurify sanitization pipeline that wraps it MUST remain in the same module

#### Scenario: contentUtils tests stay green
- **WHEN** the existing `contentUtils.test.ts` suite is executed against the post-change code
- **THEN** every case that asserts Quill bullet conversion behavior MUST pass without modification

#### Scenario: Legacy Quill post renders as semantic list
- **WHEN** a post containing Quill bullet HTML (`<ol data-list="bullet"><li>…</li></ol>`) is rendered through the standard post-display path
- **THEN** the rendered DOM MUST contain a semantic `<ul>` element (not `<ol>`) with the original list items and inline formatting preserved

### Requirement: Remove tiptap_editor_enabled Remote Config Flag

The change SHALL remove the `tiptap_editor_enabled` Firebase Remote Config flag from the client, after verifying the flag is fully rolled out and has no other consumers.

#### Scenario: Pre-deployment verification of flag rollout
- **WHEN** the implementing PR description is reviewed
- **THEN** it MUST confirm that the Firebase Remote Config console shows `tiptap_editor_enabled` at 100% true with no remaining variations or active experiments
- **AND** it MUST confirm that searches across `apps/admin/`, `functions/`, and `supabase/functions/` find no consumer of `tiptap_editor_enabled`

#### Scenario: Flag removed from RemoteConfigContext
- **WHEN** `apps/web/src/shared/contexts/RemoteConfigContext.tsx` is inspected after the change
- **THEN** the `tiptap_editor_enabled` entry MUST be removed from the flag key set, default value map, type union, and any `getValue` mapping
- **AND** the `RemoteConfigProvider` component itself MUST remain in place to serve other flags

#### Scenario: No client code reads tiptap_editor_enabled
- **WHEN** the `apps/web/` directory is searched for the string `tiptap_editor_enabled`
- **THEN** no occurrences MUST be found in source files (test fixtures excluded if any)
