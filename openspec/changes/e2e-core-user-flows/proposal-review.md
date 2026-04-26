## Review Summary

**Status**: Ready (after revision)
**Iteration**: 2 of max 2

## Findings

### Critical

1. **데이터 시드 인프라가 누락되어 있었음** (objectives-challenger, scope-analyst)
   현재 시드 스크립트는 유저만 생성. 5개 플로우 모두 보드/멤버십/글/댓글/통계 데이터가 필요한데, 이 인프라가 proposal에 명시되지 않았음.
   → **Revision에서 해결**: `e2e-data-seed` capability를 별도로 분리하고, 글로벌 시드 + spec별 생성/정리 하이브리드 전략 명시.

2. **CI Supabase 셋업이 숨겨진 인프라 작업** (scope-analyst)
   CI에서 E2E를 돌리려면 Docker-in-CI로 Supabase를 띄우고 16개 마이그레이션을 적용해야 함. 단순히 "gate 스텝 추가"가 아님.
   → **Revision에서 해결**: `ci-e2e-pipeline` capability로 분리. 워크플로우 확장 범위 명시.

3. **CI test gate를 E2E와 분리해야 함** (alternatives-explorer, scope-analyst, user-advocate)
   "테스트 파일 포함 여부" 검사와 "E2E pass/fail"은 별개. path 기반 필터링 없이 모든 PR에 적용하면 CSS/config 변경에도 false positive.
   → **Revision에서 해결**: 별도 체크로 분리. `src/` 변경 시만 동작. 초기에는 경고만.

4. **보드 접근 테스트의 예상 동작이 불명확** (scope-analyst)
   비멤버가 보드에 접근했을 때 리다이렉트/에러/빈 상태 중 어떤 것인지 미정.
   → **사용자 확인으로 해결**: 에러 페이지 표시.

### Important

5. **Flaky 테스트 대응 전략 필요** (user-advocate)
   Playwright E2E는 네트워크/타이밍 이슈로 flaky할 수 있음. 솔로 개발자에게 flaky test = deploy blocker.
   → **Accepted trade-off**: Playwright config에 이미 retry 2회 설정 있음. 추가 대응은 테스트 안정화 후 판단.

6. **글 목록: 무한스크롤 vs 페이지네이션 미정** (scope-analyst)
   다른 Playwright 인터랙션 전략이 필요.
   → **사용자 확인으로 해결**: 무한스크롤.

7. **통계/잔디 테스트에 필요한 시드 데이터 범위** (scope-analyst)
   스트릭을 표시하려면 연속 날짜에 글이 있어야 함.
   → **Design 단계에서 상세화**: 시드 스크립트에서 backdated 글 생성.

### Minor

8. **테스트 간 데이터 간섭** (objectives-challenger)
   글쓰기/댓글 테스트가 데이터를 생성하면 다른 테스트에 영향.
   → 글로벌 시드(읽기용) + spec별 생성/정리(쓰기용) 하이브리드로 대응.

9. **Vitest + MSW 하이브리드 대안** (alternatives-explorer)
   일부 플로우(pagination, stats)는 integration test로 더 효율적일 수 있음.
   → **Accepted trade-off**: 일관성을 위해 전부 Playwright E2E로 통일. 나중에 속도 이슈가 생기면 전환 검토.

## Key Questions Raised

- ~~CI에서 E2E를 어떻게 실행할 것인가?~~ → Local Supabase in CI (Docker)
- ~~글 목록은 무한스크롤인가 페이지네이션인가?~~ → 무한스크롤
- ~~비멤버 접근 시 예상 동작은?~~ → 에러 페이지
- ~~테스트 데이터 관리 전략은?~~ → 글로벌 시드 기본 + 쓰기 테스트는 spec별 관리

## Alternatives Considered

| 대안 | 판단 | 이유 |
|------|------|------|
| 아무것도 안 함 | 기각 | 수동 검증 비용이 계속 발생 |
| Vitest + MSW integration test | 기각 (for now) | 실제 브라우저 렌더링 검증이 안 됨. E2E가 "수동 검증 대체" 목표에 더 부합 |
| 스모크 테스트 1-2개만 | 기각 | 5개 플로우가 모두 핵심. 부분 커버리지는 수동 검증을 없애지 못함 |
| 회귀 발생 시에만 테스트 추가 | 기각 | "나중에 하자" 트랩. 이미 인프라가 갖춰져 있어 한 번에 하는 게 효율적 |

## Accepted Trade-offs

- **E2E 전체 Playwright**: MSW integration이 일부 케이스에서 더 빠를 수 있지만, 일관성과 "수동 검증 대체" 목표를 위해 E2E로 통일
- **Flaky test 대응은 사후 처리**: retry 2회로 시작하고, 실제 문제가 발생하면 그때 대응
- **CI test gate는 경고만**: 처음부터 블로킹하면 마찰이 큼. 안정화 후 블로킹 전환

## Revision History

- Round 1: 4개 리뷰어 (objectives-challenger, alternatives-explorer, user-advocate, scope-analyst) 실행. Critical 이슈 4건 발견.
- Round 2: proposal.md 수정 — 데이터 시드 인프라 분리, CI Supabase 파이프라인 명시, test gate 분리, 무한스크롤/에러페이지/글로벌시드 확정. Critical 이슈 모두 해소.
