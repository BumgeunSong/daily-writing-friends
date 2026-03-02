## Summary

| Layer | Total | Passed | Failed |
|-------|-------|--------|--------|
| Unit        | 22 | 22 | 0 |
| Integration | 8  | 8  | 0 |
| E2E Network Passthrough | 4 | — | — |
| E2E Local DB | 0 | — | — |

- **Unit + Integration**: 537 total tests across 39 files, all passing (Vitest)
- **E2E**: 4 Playwright specs written (`tests/image-upload.spec.ts`), require Firebase emulators to run

## Spec Coverage Map

| Spec Requirement | Scenario | Test Coverage |
|---|---|---|
| Drag & Drop | 이미지 드롭 → 업로드 | E2E T.6 |
| Drag & Drop | 드래그 진입 시각적 피드백 | Implementation (`isDragOver` + `ring-2` style) |
| Drag & Drop | 드래그 이탈 피드백 제거 | Implementation (counter pattern reset) |
| Drag & Drop | 비이미지 파일 거부 | Implementation (filter + toast) |
| Paste | 클립보드 이미지 붙여넣기 | E2E T.7 |
| Paste | 텍스트 붙여넣기 기존 동작 유지 | Implementation (only `preventDefault` on image) |
| Multi-file | 순차 업로드 + 진행 토스트 | `useImageUpload.test.ts` (multi-file cursor offset) |
| Multi-file | 부분 실패 시 계속 진행 | `useImageUpload.test.ts` (partial failure warning) |
| Multi-file | 삽입 위치 (커서 + offset) | `useImageUpload.test.ts` (nthCalledWith offset check) |
| Large File | 5MB~20MB 업로드 허용 | `ImageValidation.test.ts` (20MB 이하 통과) |
| Large File | 20MB 초과 거부 | `ImageValidation.test.ts` + `useImageUpload.test.ts` |
| Large File | 처리 후 5MB 초과 거부 | `ImageValidation.test.ts` (validateProcessedFileSize) |
| Editor Usable | 업로드 중 텍스트 입력 가능 | Structural (removed `pointer-events-none` lock) |
| HEIC Fallback | 변환 성공 | `ImageUtils.test.ts` (converts HEIC → .jpg) |
| HEIC Fallback | 변환 실패 시 원본 반환 | `ImageUtils.test.ts` (returns original file) |
| File Validation | image/* MIME 허용 | `ImageValidation.test.ts` (8 scenarios) |
| File Validation | HEIC 확장자 허용 | `ImageValidation.test.ts` |
| File Validation | 비이미지 거부 | `ImageValidation.test.ts` + `useImageUpload.test.ts` |
| Toolbar Preserved | 툴바 버튼 업로드 | `useImageUpload.test.ts` (single file) + E2E T.9 |

## Failures

None. All unit and integration tests pass.

## Unverified Specs

The following scenarios are covered only by implementation (no dedicated test assertion):

1. **드래그 진입/이탈 시각적 피드백** — `isDragOver` state toggles are tested indirectly through the hook's return value, but no test asserts the `ring-2 ring-primary/50` CSS class is applied in the DOM
2. **비이미지 파일 드롭 거부 토스트** — the drop handler's image filter logic is implemented but not unit-tested (covered by E2E T.6 scenario)
3. **텍스트 붙여넣기 기존 동작 유지** — `preventDefault` is only called when clipboard contains images; no test verifies text paste passthrough
4. **업로드 중 에디터 잠김 해제** — verified structurally (removed `pointer-events-none opacity-50`), not behaviorally tested

These are reasonable E2E-level concerns. Items 1-3 will be verified when E2E tests run with emulators.

## Fix Tasks

None required. All layers pass at the unit/integration level.
