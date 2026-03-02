## Why

사용자들이 PostEditor에서 이미지를 삽입할 때 불편을 겪고 있다. 현재 이미지 삽입은 툴바 버튼을 통한 파일 선택만 가능하며, drag & drop, copy-paste, 여러장 업로드, 고용량 파일 업로드가 모두 불가능하다. PC 사용자에게 특히 치명적인 UX 문제이다.

## What Changes

- Quill 에디터에 이미지 drag & drop 지원 추가
- Quill 에디터에 이미지 copy-paste 지원 추가
- 파일 선택기에서 여러장 이미지 선택 및 순차 업로드 지원
- 고용량 이미지 허용: 원본 파일 사이즈 체크를 처리(리사이즈/압축) 후로 이동. 원본 상한은 20MB (비정상 파일 방어용), 처리 후 상한은 5MB

## Capabilities

### New Capabilities
- `editor-image-upload`: Quill 에디터의 이미지 업로드 기능 (drag & drop, paste, multi-file, large file 지원)

### Modified Capabilities
(없음 - 기존 specs 없음)

## Impact

- `src/post/hooks/useImageUpload.ts` — 핵심 변경 대상. drop/paste/multi 핸들러 추가, 사이즈 체크 로직 변경
- `src/post/components/PostTextEditor.tsx` — 이벤트 리스너 연결
- 의존성 변경 없음 (기존 Firebase Storage, react-quill-new 그대로 사용)
