## Context

현재 E2E 테스트 인프라는 유저 인증 중심으로 구축되어 있다:
- `global-setup.ts`: Supabase health check + `seed-e2e-users.ts` (유저만 생성)
- `auth.setup.ts`: Supabase GoTrue로 인증 → `storageState.auth.json` 저장
- Playwright config: 3개 브라우저 + Mobile Chrome + `chromium-no-auth` (비인증)
- 기존 E2E: auth 플로우, 에디터 관련 (총 11 spec)

5개 새 플로우는 모두 **도메인 데이터**(보드, 멤버십, 글, 댓글)가 필요하다. 현재 시드는 이를 지원하지 않는다.

**DB 스키마 핵심 테이블:**
- `boards` → `user_board_permissions` (유저-보드 멤버십)
- `posts` (board_id, author_id 참조)
- `comments` (post_id, user_id 참조)
- `replies` (comment_id, post_id, user_id 참조)
- 통계/잔디: 별도 테이블 없음. 클라이언트에서 `posts.created_at` 기반으로 계산.

## Goals / Non-Goals

**Goals:**
- 5개 핵심 사용자 플로우를 E2E로 커버하여 배포 전 수동 검증 제거
- 도메인 데이터 시드 인프라를 구축하여 이후 E2E 테스트 추가를 쉽게 만듦
- CI에서 Playwright E2E를 Local Supabase와 함께 실행
- `src/` 변경 PR에 대해 테스트 포함 여부 경고

**Non-Goals:**
- Edge Functions 테스트 보강
- API 레이어 단위 테스트 보강
- Production E2E (이미 별도 config 존재)
- 컴포넌트 단위 렌더링 테스트

## Decisions

### 1. 도메인 시드: `seed-e2e-domain.ts` 별도 스크립트

**선택:** 기존 `seed-e2e-users.ts`와 별도로 `scripts/seed-e2e-domain.ts` 생성. `global-setup.ts`에서 유저 시드 후 순차 호출.

**시드 실행 순서와 실패 격리:**
1. `seedUsers()` 실행 → `tests/fixtures/e2e-users.json`에 유저 ID 저장
2. `seedDomain()` 실행 → `e2e-users.json`에서 유저 ID를 읽고 유효성 검증 후 삽입
3. 도메인 시드 실패 시 global-setup 전체 실패 (부분 상태 허용 안 함)

**시드 데이터:** service_role 키로 RLS 우회하여 삽입. upsert 시맨틱(`ON CONFLICT DO NOTHING`) 사용하여 멱등성 보장.
- 보드 1개 (`e2e-test-board`)
- 테스트 유저 2명의 멤버십 (`user_board_permissions`). e2e2@는 멤버십 없음 (비멤버 테스트용)
- 글 `PAGE_SIZE + 5`개 (무한스크롤 테스트용, `created_at`을 현재 시점 기준 상대 날짜로 계산)
- 댓글 2개 (기존 글에)
- 스트릭 테스트용: 연속 7일 글 (`created_at`을 `now() - N days`로 상대 계산)

**도메인 시드 출력:** `tests/fixtures/e2e-domain.json` (별도 파일, `e2e-users.json`과 분리)

**런타임 가드:** 시드 스크립트 시작 시 SUPABASE_URL이 `127.0.0.1` 또는 `localhost`를 포함하는지 검증. 아니면 즉시 실패.

**대안 기각:**
- 기존 스크립트 확장 → 책임이 비대해지고, 유저만 시드하는 prod 모드와 충돌
- 각 spec에서 자체 시드 → 느리고 중복 코드 발생

### 2. 쓰기 테스트 데이터: spec별 생성 + 방어적 정리

**선택:** 글쓰기, 댓글 작성 테스트는 spec 내에서 생성하고 정리.

**방어적 정리 전략:**
- `beforeEach`: 이전 실행에서 남은 테스트 데이터 정리 (prefix `e2e-write-` 기반 조회 후 삭제)
- `afterEach`: 현재 테스트에서 생성한 데이터 정리
- teardown 실패 시에도 다음 실행의 `beforeEach`에서 정리됨

**쓰기 테스트 격리:** 쓰기 테스트(post-write-flow, comment-flow)는 `chromium` 프로젝트에서만 실행 (크로스 브라우저 불필요). `fullyParallel` 상태에서도 각 spec이 고유 prefix를 사용하므로 충돌 없음.

### 3. 비멤버 접근 테스트: `chromium-non-member` 프로젝트

**선택:** 새 Playwright 프로젝트 `chromium-non-member` 추가.

**auth 셋업 확장:**
- `auth.setup.ts`에 두 번째 인증 추가: `e2e2@example.com` → `storageState.non-member.json`
- `chromium-non-member` 프로젝트: `storageState.non-member.json` 사용, `testMatch: /.*\.non-member\.spec\.ts/`
- 비멤버 spec 파일명: `board-access.non-member.spec.ts` (기존 `*.logged-out.spec.ts` 패턴과 일관)

### 4. CI: GitHub Actions에서 Supabase CLI로 로컬 DB 실행

**선택:** `run-playwright.yml` 워크플로우를 새로 생성. `supabase start`는 마이그레이션을 자동 적용함.

**핵심 스텝:**
1. Node.js + pnpm 설치
2. Supabase CLI 설치
3. `supabase start` (Docker 기반 — 마이그레이션 자동 적용)
4. `pnpm install`
5. `npx playwright install --with-deps`
6. `npx playwright test`

**CI health check 타임아웃:** `global-setup.ts`의 max attempts를 10 → 30으로 증가 (기존 `seed-e2e-users.ts`의 `waitForSupabase`와 일치시킴). CI에서 Docker cold start가 느릴 수 있음.

### 5. 크로스 브라우저 최적화: 데이터 플로우 spec은 chromium만

**선택:** 데이터 플로우 테스트(post-write, post-list, comment, stats, board-access)는 `chromium` 프로젝트에서만 실행. 기존 에디터/UI 테스트만 멀티 브라우저.

**이유:** 5 spec × 4 브라우저 = 20 실행은 CI 시간 낭비. 데이터 플로우는 브라우저 간 차이가 없음. Chromium만으로 충분한 커버리지.

**구현:** 새 spec 파일들을 `tests/data-flows/` 하위 디렉토리에 배치. `chromium` 프로젝트의 `testDir`을 이 디렉토리로 제한하거나, 기존 프로젝트에서 이 디렉토리를 `testIgnore`로 제외.

### 6. CI test gate: 별도 워크플로우, 경고만

**선택:** `test-gate.yml` 워크플로우를 별도 생성. `src/` 경로 변경이 있는 PR에서 `.test.` 또는 `.spec.` 파일이 없으면 PR에 `missing-tests` 라벨 부착. 블로킹하지 않음.

### 7. 무한스크롤 테스트 전략

**선택:** 스크롤 flakiness 방지를 위한 구체적 전략:
1. 초기 로드 대기: 첫 페이지 데이터가 렌더링될 때까지 `waitForSelector`
2. 마지막 아이템으로 스크롤: `locator.last().scrollIntoViewIfNeeded()`
3. 추가 로드 대기: `waitForResponse`에 URL 패턴 predicate 사용 (예: `url.includes('offset=')` 또는 `url.includes('cursor=')`)
4. 새로 로드된 아이템 존재 확인

## Risks / Trade-offs

- **CI 시간 증가** → `supabase start` ~60초 + E2E ~120초. Mitigation: unit test와 병렬 워크플로우.
- **Supabase Docker in CI 불안정** → Mitigation: retry 2회 + health check 30회.
- **시드 데이터 스키마 변경 시 깨짐** → Mitigation: REST API upsert 사용. 컬럼 삭제/변경 시만 수정 필요.
- **상대 날짜 기반 스트릭 데이터** → 시드 시점 기준 `now() - N days`. 타임존 이슈 가능. Mitigation: 스트릭 indicator 존재 여부만 검증 (구체적 숫자가 아닌 "표시됨" 확인).

## Testability Notes

### Unit (Layer 1)
해당 없음. 이번 변경은 테스트 인프라 자체를 추가하는 것이므로 새로운 비즈니스 로직이 없음.

### Integration (Layer 2)
해당 없음. API 레이어 테스트는 이번 스코프 밖.

### E2E Network Passthrough (Layer 3)
5개 E2E spec (chromium 프로젝트에서만 실행):
- `post-write-flow.spec.ts`: 에디터 → 글 작성 → 게시판 목록에서 확인.
- `post-list-scroll.spec.ts`: 시드된 글 → 스크롤 → 추가 로드 확인.
- `comment-flow.spec.ts`: 글 상세 → 댓글 작성 → 댓글 영역 확인.
- `stats-display.spec.ts`: 시드된 글의 `created_at` 기반 → 통계 페이지 렌더링 확인 (별도 stats 테이블 없음).
- `board-access.non-member.spec.ts`: 비멤버 유저 → 보드 URL 접근 → 에러 페이지 확인.

### E2E Local DB (Layer 4)
`board-access.non-member.spec.ts`는 RLS 정책 검증 성격 (비멤버 접근 차단이 RLS에 의존).
