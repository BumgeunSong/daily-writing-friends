## Review Summary

**Status**: Ready
**Iteration**: 2 of max 2

## Architecture

- D1 (DOM 이벤트 리스너): 기존 패턴과 일치. `useCopyHandler`에서 이미 동일한 패턴 사용 중. useEffect cleanup 필수 — **수용, 구현 시 반영**
- D3 (순차 multi-file): 커서 위치 race condition 발견 → **design 수정 완료**: 시퀀스 시작 시 커서 캡처
- D5 (에디터 잠금 해제): 올바른 방향. 잠금 제거 + 토스트 기반 피드백

## Security

- 파일 타입 검증은 client-side MIME + 확장자 체크. Magic byte 검증은 이 범위에서 과도 — **수용 (인증된 사용자만 업로드 가능, Firebase Storage 규칙이 추가 방어선)**
- Storage path에 사용자 ID 없음 — 기존 패턴 유지, 이 PR 범위 밖. **수용**
- 사이즈 제한 정렬: client 20MB/5MB, Firebase rules 10MB — Firebase rules를 20MB로 업데이트 필요 → **tasks에 포함**

## Quality & Performance

- 검증 로직이 훅에 결합되어 테스트 어려움 → **design 수정 완료**: `ImageValidation.ts`로 분리
- 이중 상태 추적 (`isUploading` + `isUploadingRef`) → 구현 시 단일 상태로 단순화. **tasks에 포함**
- 20MB 파일 처리 시 메모리: Canvas OOM catch 필요 → design의 Risks 테이블에 이미 포함

## Testability

- 검증 로직 분리로 순수 함수 unit test 가능 → **design 수정 완료**
- Drag/drop, paste는 JSDOM으로 불충분 → E2E (agent-browser)에서 커버. **수용**
- `processImageForUpload` 파이프라인은 JSDOM Canvas mock으로 통합 테스트 가능

## API & Integration

- `useImageUpload` 훅 API: 새 핸들러(drop/paste) 추가되지만 기존 `imageHandler` 유지 — 하위 호환
- `insertImage` 콜백 시그니처 변경 없음
- `onUploadingChange` prop은 이미 optional — 영향 없음

## Consolidated Findings

### Critical

(Addressed in revision)
- ~~Multi-file 업로드 중 커서 drift로 삽입 위치 예측 불가~~ → 시퀀스 시작 시 커서 캡처로 해결

### Important

- Firebase Storage rules를 20MB로 업데이트해야 design과 일치
- HEIC 변환 실패 시 fallback 로직을 `processImageForUpload` 내부에 try-catch로 구현 필요
- DOM 이벤트 리스너 cleanup을 useEffect return에서 반드시 처리

### Minor

- Canvas OOM 에러 메시지를 사용자 친화적으로
- `formatDate` 헬퍼를 export하여 독립 테스트 가능하게

## Accepted Trade-offs

| Trade-off | Rationale |
|-----------|-----------|
| Magic byte 검증 생략 | 인증 필수 + Firebase rules가 방어선. 소셜 글쓰기 앱에서 파일 스푸핑 공격 가능성 극히 낮음 |
| Storage path에 userId 미포함 | 기존 패턴 유지. 별도 보안 개선 이슈로 분리 |
| 업로드 진행률 시뮬레이션 | Firebase `uploadBytes`가 progress callback 미지원. 실제 진행률은 non-goal |
| HEIC fallback 시 브라우저 미표시 가능 | 데이터 손실 방지 우선. 서버사이드 변환은 향후 대응 |

## Revision History

- Round 1: 5명 리뷰어 병렬 디스패치 (architecture, security, quality, testability, integration)
- Round 2: Critical 피드백 반영 — (1) multi-file 커서 캡처 추가 (2) 검증 로직 분리 (ImageValidation.ts). Important 항목은 tasks에서 구현 시 반영.
