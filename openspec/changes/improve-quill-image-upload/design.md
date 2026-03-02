## Context

PostEditor는 Quill 기반 리치텍스트 에디터(`PostTextEditor.tsx`)를 사용한다. 이미지 업로드는 `useImageUpload` 훅이 담당하며, 현재 유일한 입력 방법은 툴바 버튼을 통한 파일 선택이다.

현재 업로드 흐름:
1. 툴바 이미지 버튼 클릭 → `<input type="file">` 생성 → 파일 1개 선택
2. 원본 5MB 체크 (처리 전 거부)
3. `processImageForUpload()` — HEIC 변환, 1920px 리사이즈, JPEG 0.85 압축
4. Firebase Storage 업로드 → `insertEmbed()`로 에디터에 삽입

핵심 파일:
- `src/post/hooks/useImageUpload.ts` — 업로드 로직
- `src/post/components/PostTextEditor.tsx` — Quill 에디터 컴포넌트
- `src/post/utils/ImageUtils.ts` — 이미지 처리 유틸

## Goals / Non-Goals

**Goals:**
- Drag & drop, paste, multi-file 선택으로 이미지 삽입 가능
- 고용량 원본 파일(최대 20MB)을 처리 후 업로드 허용
- 기존 툴바 버튼 업로드 동작 유지

**Non-Goals:**
- 이미지 갤러리/캐러셀 UI
- 서버사이드 이미지 처리
- 업로드 취소 기능
- 이미지 드래그 재정렬
- 실시간 업로드 진행률 (Firebase `uploadBytes`는 progress callback 미지원)

## Decisions

### D1: 이벤트 핸들링 — DOM 이벤트 리스너 방식

Quill 에디터의 `.root` DOM 엘리먼트에 `drop`과 `paste` 이벤트 리스너를 추가한다.

**대안 검토:**
- Quill Clipboard Module 커스터마이징 — Quill의 내부 API에 의존하여 버전 업데이트 시 깨질 위험
- Quill 래퍼 div에 이벤트 바인딩 — 이벤트 버블링으로 동작하지만, `.root`가 더 정확한 타겟

**선택 이유:** DOM 이벤트는 에디터 프레임워크에 독립적이고, 기존 `PostTextEditor.tsx`에서 이미 `.root` 참조를 사용 중(line 258).

### D2: 사이즈 검증 — 이중 체크

```
원본 파일 → 20MB 초과? → 즉시 거부 ("파일이 너무 큽니다")
         → 20MB 이하? → processImageForUpload() → 처리 후 5MB 초과? → 거부 ("처리 후에도 파일이 큽니다")
                                                 → 5MB 이하? → 업로드
```

**대안 검토:**
- 원본 제한 없이 처리 후만 체크 — 100MB 파일이 들어오면 브라우저 메모리 문제
- 원본 5MB 유지 — 현재 문제의 근본 원인

**선택 이유:** 20MB는 iPhone ProRAW(~25MB)를 제외한 대부분의 카메라 사진을 커버. 처리 후 5MB는 Firebase Storage 규칙(10MB)의 안전 마진.

### D3: Multi-file 업로드 — 순차 처리, 단일 진행 토스트

파일 선택 시 `multiple` 속성 추가. 선택된 파일들을 순차적으로 처리/업로드.

```
[파일1 처리 → 업로드 → 삽입] → [파일2 처리 → 업로드 → 삽입] → ... → 완료 토스트
```

- 토스트: "이미지 업로드 중... (2/5)"
- 실패 시: 해당 파일 건너뛰고 계속 진행. 완료 후 "3장 업로드 완료, 2장 실패" 요약
- 에디터는 업로드 중 입력 가능 (잠금 해제)

**대안 검토:**
- 병렬 업로드 — 모바일 메모리 부담, 삽입 순서 보장 불가
- 에디터 잠금 유지 — multi-file에서 수십 초 잠금은 UX 악화

**선택 이유:** 순차 처리는 메모리 안전하고 삽입 순서가 보장됨. 에디터 잠금 해제는 long upload 시 사용자 자유도 보장.

**커서 위치 처리:** Multi-file 시퀀스 시작 시점에 현재 커서 위치를 캡처한다. 각 이미지는 이전 이미지 바로 뒤에 삽입한다. 사용자가 업로드 중 타이핑하더라도, 이미지 삽입 위치는 시퀀스 시작 시점의 커서 위치 기준으로 유지된다.

### D4: Drag & drop 시각 피드백

드래그 진입 시 에디터 영역에 시각적 피드백 제공:
- `dragenter`: 에디터에 하이라이트 스타일 추가 (예: `ring-2 ring-primary/50`)
- `dragleave`/`drop`: 스타일 제거
- 비이미지 파일 드롭 시: 토스트로 "이미지 파일만 업로드할 수 있습니다" 안내

### D5: 업로드 중 에디터 상태 — 잠금 해제

현재: `isUploading` 시 `pointer-events-none opacity-50`으로 전체 에디터 잠금.
변경: 업로드 중에도 에디터 입력 허용. 토스트로 진행 상황만 표시.

**이유:** Multi-file 업로드 시 수십 초 잠금은 허용 불가. 사용자가 텍스트를 계속 입력할 수 있어야 함.

### D6: HEIC 변환 실패 시 — 원본 업로드 시도

`heic2any` 실패 시 원본 파일을 그대로 업로드 시도. Firebase Storage는 HEIC도 저장 가능. 브라우저에서 HEIC 표시가 안 될 수 있으나, 데이터 손실보다 나음.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Quill paste 핸들러와 DOM paste 리스너 충돌 | DOM 리스너에서 이미지 감지 시 `event.preventDefault()` 호출하여 Quill 기본 동작 차단 |
| 20MB 파일 처리 시 브라우저 메모리 부족 (저사양 기기) | Canvas 리사이즈 실패 시 catch하고 "이 기기에서는 큰 이미지를 처리할 수 없습니다" 안내 |
| 여러 이미지 순차 업로드 중 네트워크 끊김 | 실패 파일 건너뛰고 계속 진행, 최종 요약에서 실패 수 표시 |
| 드래그 중 `dragenter`/`dragleave` 이벤트 자식 요소에서 중복 발생 | counter 패턴 사용 (enter +1, leave -1, 0일 때만 스타일 제거) |
| Multi-file 업로드 중 사용자 편집으로 커서 위치 변경 | 시퀀스 시작 시 커서 위치 캡처, 이후 삽입은 캡처된 위치 기준 |
| HEIC fallback으로 원본 업로드 시 브라우저에서 표시 불가 | 데이터 보존 우선. 향후 서버사이드 변환으로 대응 가능 |

## Architecture Note: 검증 로직 분리

테스트 용이성을 위해 검증 로직(사이즈, 파일 타입)을 순수 함수로 추출한다. `useImageUpload` 훅은 이 함수들을 호출만 한다.

```
ImageValidation.ts (새 파일, 순수 함수)
├─ validateFileSize(file, maxRaw, maxProcessed) → { valid, reason }
├─ validateFileType(file) → { valid, reason }
└─ (unit test 가능, React 의존성 없음)

useImageUpload.ts (훅, 오케스트레이션)
├─ 이벤트 핸들러 등록/해제
├─ 검증 → 처리 → 업로드 → 삽입 파이프라인
└─ 토스트/에러 UI 관리
```

## Testability Notes

### Unit (Layer 1)
- **사이즈 검증 로직** (`ImageValidation.ts`): 20MB 초과 거부, 20MB 이하 통과, 처리 후 5MB 초과 거부 — Vitest
- **파일 타입 검증** (`ImageValidation.ts`): image/* 허용, 비이미지 거부, HEIC 확장자 허용 — Vitest
- **Multi-file 결과 집계**: N개 중 성공/실패 카운트 — Vitest

### Integration (Layer 2)
- **이미지 처리 파이프라인**: `processImageForUpload()`에 20MB 파일 입력 → 처리 후 파일 사이즈 < 5MB 확인 — Vitest
- **Firebase Storage 업로드**: mock storage로 uploadBytes/getDownloadURL 흐름 테스트 — Vitest

### E2E Network Passthrough (Layer 3)
- **Drag & drop 흐름**: 파일을 에디터에 드래그 → 하이라이트 표시 → 드롭 → 이미지 삽입 확인 — agent-browser
- **Paste 흐름**: 클립보드에 이미지 복사 → 에디터에서 Ctrl+V → 이미지 삽입 확인 — agent-browser
- **Multi-file 흐름**: 3개 파일 선택 → 순차 업로드 → 3개 이미지 삽입 확인 — agent-browser

### E2E Local DB (Layer 4)
- 해당 없음 (이 변경은 클라이언트 전용, DB 관련 없음)
