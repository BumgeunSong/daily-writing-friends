## Review Summary

**Status**: Ready (after revision)
**Iteration**: 2 of max 2

## Architecture

- **(Resolved)** Stats/streak에 별도 테이블이 없음 → 디자인에 "posts.created_at 기반 클라이언트 계산"으로 명확화. 시드는 상대 날짜로 글 생성.
- **(Resolved)** `chromium-non-member` 네이밍 → `*.non-member.spec.ts` 패턴으로 기존 `*.logged-out.spec.ts` 컨벤션과 일관되게 정리.
- **(Resolved)** CI health check 타임아웃 → 10 → 30회로 증가, `seed-e2e-users.ts`와 일치.
- **(Resolved)** 시드 멱등성 → upsert 시맨틱 명시.

## Security

- **(Resolved)** 런타임 가드 추가: SUPABASE_URL이 localhost/127.0.0.1이 아니면 시드 스크립트 즉시 실패.
- storageState.auth.json은 이미 .gitignore에 포함. 위험 낮음.

## Quality & Performance

- **(Resolved)** 백데이팅 날짜 → 상대 날짜(`now() - N days`)로 변경. 스트릭 검증은 indicator 존재 여부만 확인.
- **(Resolved)** afterEach 실패 대응 → beforeEach 정리 가드 추가 (방어적 정리).
- **(Resolved)** 글 개수 매직넘버 → `PAGE_SIZE + 5`로 페이지 사이즈와 연동.
- **(Resolved)** 시드 멱등성 → upsert 패턴 명시.

## Testability

- **(Resolved)** 병렬 쓰기 충돌 → 쓰기 테스트는 chromium만, 고유 prefix(`e2e-write-`) 사용으로 격리.
- **(Resolved)** 크로스 브라우저 과잉 → 데이터 플로우 spec은 chromium만 실행 (5 spec × 1 browser).
- **(Resolved)** 무한스크롤 flakiness → `scrollIntoViewIfNeeded()` + URL 패턴 predicate `waitForResponse` 전략 명시.
- **(Resolved)** 스트릭 테스트 비즈니스 로직 커플링 → behavior 기반 검증(indicator 존재 여부)으로 완화.

## API & Integration

- **(Resolved)** 시드 순서/실패 격리 → users → e2e-users.json 저장 → domain이 JSON 읽고 ID 검증 → 실패 시 전체 중단.
- **(Resolved)** chromium-non-member auth 갭 → auth.setup.ts에서 e2e2@ 인증 → storageState.non-member.json 저장.
- **(Resolved)** 도메인 시드 출력 → `e2e-domain.json` 별도 파일 (e2e-users.json과 분리).
- teardown 비대칭(auth는 프로젝트 레벨, domain은 spec 레벨) → 문서화 필요하지만 설계상 합리적.

## Consolidated Findings

### Critical
모든 Critical 이슈 해결됨:
1. ~~Stats 테이블 미존재~~ → posts.created_at 기반으로 명확화
2. ~~병렬 쓰기 충돌~~ → chromium만 + prefix 격리
3. ~~시드 순서/실패 격리 미정~~ → 순차 실행 + ID 검증 + 실패 시 전체 중단

### Important
모든 Important 이슈 해결됨:
1. ~~백데이팅 날짜 커플링~~ → 상대 날짜 + behavior 검증
2. ~~chromium-non-member 네이밍~~ → *.non-member.spec.ts 패턴
3. ~~auth.setup.ts 확장 필요~~ → e2e2@ 인증 추가
4. ~~CI health check 타임아웃~~ → 30회로 증가
5. ~~service_role 런타임 가드~~ → localhost 검증 추가
6. ~~무한스크롤 flakiness~~ → 구체적 스크롤 전략 명시
7. ~~크로스 브라우저 과잉~~ → chromium만
8. ~~afterEach 실패 대응~~ → beforeEach 정리 가드

### Minor
- teardown 비대칭: auth는 프로젝트 레벨, domain은 spec 레벨. 현재 설계에서 합리적이므로 수용.
- `run-playwright.yml` 네이밍: `run-vitest.yml`과 일관됨. 이슈 없음.

## Accepted Trade-offs

- **Chromium only for data-flow specs**: 크로스 브라우저 커버리지를 포기하지만, 데이터 플로우는 브라우저 간 차이 없음. CI 시간 4배 절감.
- **상대 날짜 기반 스트릭 시드**: 시드 시점에 따라 "오늘"이 달라지지만, behavior 기반 검증으로 완화.
- **teardown 이중 메커니즘**: auth(프로젝트 레벨)와 domain(spec 레벨) 정리가 다른 패턴. 각각의 이유가 명확하므로 수용.

## Revision History

- Round 1: 5개 리뷰어 실행. Critical 3건, Important 8건 발견.
- Round 2: design.md 수정 — stats 테이블 부재 명확화, 병렬 쓰기 격리, 시드 순서/실패 처리, 네이밍 컨벤션, auth 확장, health check, 런타임 가드, 스크롤 전략, 크로스 브라우저 최적화. 모든 Critical/Important 해결.
