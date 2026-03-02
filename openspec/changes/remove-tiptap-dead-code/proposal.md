## Why

TipTap 에디터는 remote config(`tiptap_editor_enabled: false`)로 비활성화되어 있으며, 구현 후 한번도 테스트되지 않은 미완성 기능이다. Quill 에디터를 계속 사용하기로 결정했으므로 dead code를 제거하여 번들 사이즈를 줄이고 코드베이스를 정리한다. TipTap 코드는 git history에 보존되므로 필요 시 복원 가능하다.

## What Changes

- TipTap 에디터 컴포넌트 삭제: `EditorTiptap.tsx`
- TipTap 전용 UI 컴포넌트 삭제: `UploadProgress.tsx`, `ResponsiveEditorToolbar.tsx`, `EditorContentArea.tsx`, `EditorToolbar.tsx`
- TipTap 전용 훅 삭제: `useTiptapEditor.ts`, `useTiptapImageUpload.ts`, `useEditorCopy.ts`, `useScrollIndicators.ts`
- TipTap 관련 npm 패키지 제거: `@tiptap/extension-dropcursor`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/react`, `@tiptap/starter-kit`

## Capabilities

### New Capabilities
- `tiptap-removal`: TipTap 관련 dead code 및 의존성 제거 범위 정의

### Modified Capabilities
(없음)

## Impact

- `src/post/components/` — 5개 파일 삭제 (EditorTiptap, UploadProgress, ResponsiveEditorToolbar, EditorContentArea, EditorToolbar)
- `src/post/hooks/` — 4개 파일 삭제 (useTiptapEditor, useTiptapImageUpload, useEditorCopy, useScrollIndicators)
- `package.json` — 6개 `@tiptap/*` 패키지 제거
- 프로덕션 동작에 영향 없음 (모든 파일이 TipTap 서브트리에서만 참조됨, Quill과 공유 없음)
