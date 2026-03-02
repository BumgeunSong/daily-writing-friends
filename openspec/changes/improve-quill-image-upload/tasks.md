## 1. Validation Logic Extraction

- [x] 1.1 Create `src/post/utils/ImageValidation.ts` with pure functions: `validateFileSize(file, maxRawBytes, maxProcessedBytes)` and `validateFileType(file)` returning `{ valid, reason }` objects
- [x] 1.2 Update `useImageUpload.ts` to use extracted validation functions instead of inline checks. Change raw size limit from 5MB to 20MB. Add post-processing 5MB check after `processImageForUpload()`

## 2. HEIC Fallback

- [x] 2.1 Add try-catch around `heic2any()` call in `processImageForUpload()` (ImageUtils.ts). On failure, return original file with console warning. Add Canvas OOM catch in `resizeImageForUpload()` with user-friendly error message

## 3. Multi-file Support

- [x] 3.1 Add `multiple` attribute to file input in `useImageUpload.ts`. Implement sequential file loop with progress tracking (`succeeded`/`failed` counters)
- [x] 3.2 Update toast management: loading toast shows "이미지 업로드 중... (M/N)" during sequence, summary toast "X장 업로드 완료, Y장 실패" on completion
- [x] 3.3 Capture cursor position at sequence start. Insert each image at captured position + offset (after previously inserted images)

## 4. Drag & Drop Support

- [x] 4.1 Add `drop` event handler to `useImageUpload` hook. Accept `editorRoot` ref as parameter. Extract image files from `event.dataTransfer.files`, reject non-image files with toast
- [x] 4.2 Add `dragenter`/`dragleave`/`dragover` handlers with counter pattern for highlight state. Return `isDragOver` boolean from hook
- [x] 4.3 Wire up event listeners in `PostTextEditor.tsx` via useEffect with cleanup. Apply drag highlight style (`ring-2 ring-primary/50`) when `isDragOver` is true

## 5. Paste Support

- [x] 5.1 Add `paste` event handler to `useImageUpload` hook. Extract image from `event.clipboardData.items`. Call `event.preventDefault()` when image detected to prevent Quill default handling
- [x] 5.2 Wire up paste listener in `PostTextEditor.tsx` via useEffect with cleanup on editor `.root` element

## 6. Editor Unlock During Upload

- [x] 6.1 Remove `pointer-events-none opacity-50` editor lock in `PostTextEditor.tsx`. Remove `isUploadingRef` dual state tracking, simplify to single state management
- [x] 6.2 Remove `onUploadingChange` prop propagation if no longer needed, or keep as optional for parent awareness

## 7. Firebase Storage Rules Update

- [x] 7.1 Update `firebase/storage.rules` to allow 20MB file size (align with client-side limit)

## Tests

### Unit (Vitest)

- [x] T.1 `ImageValidation.test.ts`: validateFileSize — 20MB 초과 거부, 20MB 이하 통과, 처리 후 5MB 초과 거부
- [x] T.2 `ImageValidation.test.ts`: validateFileType — image/* 허용, HEIC 확장자 허용, 비이미지 거부
- [x] T.3 `ImageValidation.test.ts`: multi-file 결과 집계 — N개 중 성공/실패 카운트 정확성

### Integration (Vitest)

- [x] T.4 `ImageUtils.test.ts`: processImageForUpload — HEIC 변환 실패 시 원본 반환 fallback 동작
- [x] T.5 `useImageUpload.test.ts`: mock Firebase Storage로 업로드 → insertImage 호출 흐름 검증

### E2E (agent-browser)

- [ ] T.6 Drag & drop: 이미지 파일 에디터 드롭 → 업로드 → 에디터에 이미지 표시 확인
- [ ] T.7 Paste: 클립보드 이미지 붙여넣기 → 업로드 → 에디터에 이미지 표시 확인
- [ ] T.8 Multi-file: 3개 이미지 선택 → 순차 업로드 → 3개 이미지 에디터에 표시 확인
- [ ] T.9 Regression: 툴바 이미지 버튼 → 파일 선택 → 업로드 → 기존 동작 유지 확인
