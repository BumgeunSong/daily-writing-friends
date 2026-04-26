## Why

배포할 때마다 글쓰기, 댓글, 통계, 권한 등을 수동으로 검증하고 있다. 핵심 사용자 플로우를 E2E 테스트로 커버하면 CI 통과 = 안전한 배포가 되어 수동 검증을 없앨 수 있다.

## What Changes

### 1. 도메인 데이터 시드 인프라
현재 시드 스크립트(`seed-e2e-users.ts`)는 유저만 생성한다. 5개 E2E 플로우를 위해 보드, 멤버십, 글, 댓글, 통계 데이터를 시드하는 인프라를 먼저 구축한다.
- 글로벌 시드: 테스트 시작 전 한 번 실행. 읽기 전용 테스트용 공통 데이터.
- 쓰기 테스트(글쓰기, 댓글): 각 spec에서 생성 후 teardown.

### 2. Playwright E2E 테스트 5개
- **글쓰기 → 노출**: 에디터에서 글 작성 → 게시판 목록에서 해당 글 확인
- **글 목록 무한스크롤**: 충분한 글이 시드된 상태에서 스크롤 → 추가 데이터 로드 확인
- **댓글 작성 → 노출**: 글 상세에서 댓글 작성 → 댓글 영역에 노출 확인
- **통계/잔디 데이터 표시**: 시드된 글 데이터 기반으로 통계 페이지 데이터 렌더링 확인
- **보드 접근 권한**: 비멤버 유저로 보드 URL 접근 → 에러 페이지 표시 확인

### 3. CI에서 Local Supabase로 E2E 실행
GitHub Actions에서 Docker로 Supabase를 띄우고, 마이그레이션 적용 후 E2E 실행. 기존 `run-playwright.yml` 워크플로우 확장.

### 4. CI 테스트 gate (별도 체크)
`src/` 변경이 포함된 PR에서 테스트 파일이 없으면 경고 라벨 부착. E2E pass/fail과는 별도 체크로 분리. 처음에는 경고만, 안정화 후 블로킹으로 전환.

## Capabilities

### New Capabilities
- `e2e-data-seed`: E2E 테스트를 위한 도메인 데이터 시드/정리 인프라 (보드, 멤버십, 글, 댓글, 통계)
- `e2e-post-flow`: 글쓰기 후 게시판에 글이 노출되는 전체 플로우 검증
- `e2e-post-list`: 글 목록 무한스크롤 동작 검증
- `e2e-comment-flow`: 댓글 작성 후 댓글이 노출되는 플로우 검증
- `e2e-stats-display`: 통계/잔디 페이지에서 데이터가 정상 표시되는지 검증
- `e2e-board-access`: 비멤버의 보드 접근 시 에러 페이지 표시 검증
- `ci-e2e-pipeline`: CI에서 Local Supabase + Playwright E2E 실행 파이프라인
- `ci-test-gate`: src/ 변경 시 테스트 포함 여부 경고 (별도 체크)

### Modified Capabilities

(없음)

## Impact

- `tests/` 디렉토리: 새 E2E spec 파일 5개 + 시드 스크립트 추가
- `tests/fixtures/` 또는 `tests/helpers/`: 도메인 데이터 시드/정리 유틸 추가
- `.github/workflows/run-playwright.yml`: Supabase Docker 셋업 + 마이그레이션 스텝 추가
- `.github/workflows/`: 테스트 gate 워크플로우 추가 (별도 파일)
- `playwright.config.ts`: 필요 시 설정 조정
- `scripts/seed-e2e-users.ts`: 도메인 데이터 시드로 확장 또는 별도 스크립트
