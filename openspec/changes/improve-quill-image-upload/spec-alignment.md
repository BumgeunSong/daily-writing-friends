## Alignment Summary

| Spec File | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| specs/editor-image-upload/spec.md | Drag and Drop — 이미지 드롭 | Aligned | `handleDrop` filters images, calls `processFiles` |
| specs/editor-image-upload/spec.md | Drag and Drop — 시각적 피드백 | Aligned | `isDragOver` + `ring-2 ring-primary/50` in PostTextEditor |
| specs/editor-image-upload/spec.md | Drag and Drop — 이탈 시 피드백 제거 | Aligned | Counter pattern resets `isDragOver` to false |
| specs/editor-image-upload/spec.md | Drag and Drop — 비이미지 거부 | Aligned | Toast "이미지 파일만 업로드할 수 있습니다." on non-image drop |
| specs/editor-image-upload/spec.md | Paste — 클립보드 이미지 | Aligned | `handlePaste` extracts image items, calls `processFiles` |
| specs/editor-image-upload/spec.md | Paste — 텍스트 기존 동작 유지 | Aligned | `preventDefault` only when `imageFiles.length > 0` |
| specs/editor-image-upload/spec.md | Multi-file — 순차 업로드 + 진행 토스트 | Aligned | Sequential loop with `이미지 업로드 중... (M/N)` toast |
| specs/editor-image-upload/spec.md | Multi-file — 부분 실패 시 계속 진행 | Aligned | Try-catch per file, `X장 업로드 완료, Y장 실패` summary |
| specs/editor-image-upload/spec.md | Multi-file — 삽입 위치 (커서 + offset) | Aligned | `cursorIndex + insertOffset`, offset increments on success |
| specs/editor-image-upload/spec.md | Large File — 5MB~20MB 허용 | Aligned | `MAX_RAW_FILE_SIZE = 20MB`, processImageForUpload resizes |
| specs/editor-image-upload/spec.md | Large File — 20MB 초과 거부 | Aligned | `validateFileSize` returns `exceeds_raw_limit` |
| specs/editor-image-upload/spec.md | Large File — 처리 후 5MB 초과 거부 | Aligned | `validateProcessedFileSize` returns `exceeds_processed_limit` |
| specs/editor-image-upload/spec.md | Editor Usable — 업로드 중 잠김 해제 | Aligned | Removed `pointer-events-none opacity-50`, toast-only progress |
| specs/editor-image-upload/spec.md | HEIC Fallback — 변환 성공 | Aligned | `convertHeicToJpeg` → `.jpg` file with `image/jpeg` type |
| specs/editor-image-upload/spec.md | HEIC Fallback — 변환 실패 시 원본 | Aligned | try-catch returns original file with `console.warn` |
| specs/editor-image-upload/spec.md | File Validation — image/* 허용 | Aligned | `validateFileType` checks `file.type.startsWith('image/')` |
| specs/editor-image-upload/spec.md | File Validation — HEIC 확장자 허용 | Aligned | Regex `/\.(heic|heif)$/i` as secondary check |
| specs/editor-image-upload/spec.md | File Validation — 비이미지 거부 | Aligned | Returns `not_image`, message "이미지 파일만 업로드할 수 있습니다." |
| specs/editor-image-upload/spec.md | Toolbar Upload Preserved | Aligned | `imageHandler` creates file input with `multiple`, same flow |

## Drifted Requirements

None. All spec requirements match the implementation exactly.

## Missing Requirements

None.

## Removed Requirements

None.

## Spec Updates Made

No spec updates needed — implementation faithfully follows all spec scenarios.
