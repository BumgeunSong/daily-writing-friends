## Review Summary

**Status**: Ready
**Iteration**: 2 of max 2

## Findings

### Critical

(Addressed in revision)
- ~~사이즈 체크가 처리 전에 발생하여 고용량 파일이 불필요하게 거부됨~~ → 원본 20MB / 처리 후 5MB 이중 체크로 수정

### Important

- **Multi-image 업로드 UX 명세 필요**: 순차/병렬, 개별 진행률 vs 배치 진행률, 실패 시 동작 → design에서 상세화
- **Drag & drop 시각 피드백 필요**: 드래그 중 에디터 영역 하이라이트 → design에서 상세화
- **모바일 UX**: 모바일에서 drag & drop은 실질적으로 사용 불가. paste와 파일 선택이 주요 입력 방법 → 수용 (desktop-first for drag & drop)

### Minor

- 파일명 충돌 가능성 (timestamp 기반) — 현실적으로 발생 확률 극히 낮음, 수용
- 에디터 포커스 복원 — 업로드 후 에디터에 자동 포커스 반환 권장

## Key Questions Raised

1. 네 가지 기능을 한번에 출시할지 phased로 갈지? → 단일 변경으로 진행. 모두 `useImageUpload.ts` 내 변경이므로 분리의 이점이 없음
2. 에디터 잠금 정책 — 업로드 중 에디터 입력 허용할지? → design에서 결정
3. HEIC 변환 실패 시 fallback — 원본 업로드 vs 거부? → design에서 결정

## Alternatives Considered

| 대안 | 판정 | 이유 |
|------|------|------|
| TipTap으로 전환 | 기각 | 미완성/미테스트, 전환 비용 > 4개 기능 추가 |
| 서드파티 라이브러리 (Uppy, Dropzone) | 기각 | 과도한 의존성, DOM API로 충분 |
| Drag & drop만 먼저 출시 | 기각 | 모든 변경이 같은 파일에 집중, 분리 이점 없음 |
| 서버사이드 리사이즈 | 별도 이슈 | 현재 변경과 독립적 |

## Accepted Trade-offs

- 모바일 drag & drop은 플랫폼 제약으로 완벽 지원 불가 — paste와 파일 선택으로 충분
- 파일명 유니크니스는 timestamp 기반 유지 — UUID 도입은 과도
- 업로드 진행률은 시뮬레이션 (Firebase uploadBytes는 progress callback 미지원)

## Revision History

- Round 1: 6명 리뷰어 병렬 디스패치 (objectives-challenger, alternatives-explorer, user-advocate × 2 changes)
- Round 2: Critical 피드백 반영하여 proposal 수정 (사이즈 체크 이중화, 명확한 상한 명시). Important 항목은 design 단계에서 상세화 예정.
