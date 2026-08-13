# Visual gate — baseline 관리와 환경 매트릭스 설계

날짜: 2026-08-13 (초안), 같은 날 4각도 리뷰 후 재순서화
브랜치: `BumgeunSong/visual-regression-gate` (PR #749)
선행: `2026-08-12-dom-diff-matcher-plan.md` (diff 엔진), `2026-08-09-visual-regression-gate-mvp.md`

## 목적

diff 엔진(treematch + A층 절대 규칙 + data-vg 소스 귀속)은 완성·검증됐다. 남은 세 가지 — 무엇을 기준으로 비교하나(baseline), 어떤 화면·환경을 검사하나(시나리오·환경), 언제 도나(생명주기) — 를 확정한다. 철학: in-loop, gate-over-prompt, **시각 검증이지 행동 검증이 아니다**.

## 리뷰가 뒤집은 것 (초안 → 개정)

초안은 baseline-first였다(merge-base 기준점 + 일회용 워크트리 캡처 + pre-commit 게이트). 아키텍처·결정성·워크플로·YAGNI 4각도 서브에이전트 리뷰가 독립적으로 같은 결론에 수렴했다.

- **치명 1 — 일회용 워크트리가 이 레포에서 부팅 불가.** pnpm 모노레포라 `node_modules`·`.pnpm` 스토어·`.env`가 전부 gitignore. `git worktree add <base>`는 추적 파일만 체크아웃하므로 vite 바이너리조차 없다. 초안의 "일반 경로"는 첫 실행부터 죽는다.
- **치명 2 — MVP 페이로드가 타깃 회귀를 못 낸다.** 게이트가 잡으려는 건 페이지 구성·콘텐츠 길이·반응형 회귀인데, 초안 MVP 시나리오는 640px 박스에 갇힌 상태 없는 격리 컴포넌트 3개다(가짜 클라이언트가 전부 빈 데이터). 정작 그 회귀를 만드는 진짜 페이지·상태는 `?__fixture=`째로 뒤로 밀렸다. 가장 약한 가정: 격리 컴포넌트가 페이지 회귀를 대표한다. baseline 기계가 페이로드를 앞선다.
- **pre-commit은 틀린 훅.** 실측 추정 커밋당 40~70초, 새 브랜치/rebase 90초~2.5분. 에이전트가 `--no-verify`로 게이트를 무력화한다.

**결론: 순서를 뒤집는다. A층 게이트 먼저 → 진짜 시나리오 → baseline B층 맨 뒤.** A층은 baseline이 필요 없어 어떤 UI에도 지금 값을 낸다. baseline 기계는 시나리오가 진짜 상태 페이지가 된 뒤에야 값을 하므로 마지막에 짓는다.

## 확정된 결정 (개정)

1. **MVP = A층 게이트.** baseline·merge-base·워크트리·treematch 없이, 이미 있는 절대 규칙(가로 오버플로 / 인터랙티브 뷰포트 이탈 / 고정 겹침 / 텍스트 클립)만으로 현재 트리를 검사한다. after-only 렌더라 싸다.
2. **훅 = 명시적 에이전트 호출 `check`(주) + pre-push(안전망).** pre-commit 아님. 변경파일→시나리오 스코프와 교차 커밋 캐시가 생기기 전엔 pre-commit에 얹지 않는다. 인프라·flaky 실패는 요란하게 통과(loud-pass), stable하게 판정된 회귀만 차단.
3. **시나리오 단위 = URL로 주소지정되는 정적 렌더 상태.** 상태별 차이는 `?__fixture=`로 정적 도달(스크립트 상호작용 금지 = 행동검증 배제). 단 진짜 상태 페이지는 Phase 2에서 MSW 라우트 렌더로 실제 구현한다. 그전까지 `scenarios.json`은 인라인 목록으로 두고 커밋 스키마로 굳히지 않는다.
4. **baseline 저장 = 로컬 per-dev 재생성, gitignore.** 같은 머신 self-compare로 폰트/OS 결정성. 공유·CI 아님. (Phase 3에서 도입)
5. **환경**: A층은 E0/E1/E2/E4(chromium). E2 320이 오버플로를, E4가 반응형을 잡는 A층의 실익. E5 webkit은 B층 diff에서 의미가 크므로 Phase 3로.
6. **baseline B층은 진짜 시나리오 위에 맨 마지막.** 그때 아래 "리뷰 반영"의 worktree-deps·캐시키·동시성·결정성을 전부 적용한다.

## 단계 (재순서)

- **Phase 1 — A층 게이트 (MVP).** current-tree 캡처 + 절대 규칙. 아래 결정성 수정 포함. 명시적 `check` 커맨드 + pre-push 배선. baseline/merge-base/worktree/treematch 없음. 서버 생명주기(부팅·PID 추적·finally·SIGINT 정리) 구현.
- **Phase 2 — 진짜 시나리오.** `?__fixture=` 계약 정의(어떻게 MSW 핸들러 상태를 고르나), MSW를 하네스에 등록, 라우터 마운트, auth 주입, `scenarios.json`이 실제 라우트 URL을 갖게. 이게 없으면 시나리오는 실물이 아니다.
- **Phase 3 — baseline B층.** 진짜 시나리오 위 before/after. in-place base 캡처(node_modules 재사용), 캐시키 = base+lockfile, 레지스트리 재조정, merge-base `origin/main`, LRU 캐시, 동시성 네임스페이싱, 원자적 publish, E5 webkit 실측.

## 리뷰 반영 — 반드시 고칠 것

### 결정성 (Phase 1에서 바로)
- **시계·RNG 동결**: `addInitScript`로 고정 `Date`/`performance.now`/`Math.random`/`crypto.randomUUID`. 상대시각("3분 전")·랜덤 id가 `ownText`에 새어 상시 오탐을 만드는 걸 원천 차단.
- **최종 정지 신호**: rAF 2회 일치는 순간 정지지 최종 정지가 아니다(스켈레톤→콘텐츠 중간 고원에서 오탐). N(≥3) 연속 동일 또는 정착 신호(pending fetch 0 + `fonts.ready` + MutationObserver 정적 창) 후 비교 진입.
- **networkidle 제거** → `load` + 앱 ready 신호(하네스가 MSW·폰트 준비 후 세우는 `data-vg-ready`).
- **`font-display: block`** 을 게이트 CSS에 추가(폴백 폰트 메트릭 창 제거).
- **empty-root stub 금지**: `[data-gate-root]` 셀렉터 타임아웃이면 빈 1노드 트리를 매처에 넣지 말고 `stable=false`(판정 불가)로.
- **메트릭 추가**: `boxShadow`, `borderWidth`/`borderColor`, `borderRadius`, `textAlign`, `transform` 지문. 테두리·그림자·변형 제거 같은 흔한 회귀를 지금은 통과시킨다.
- **per-env EPS + round-at-compare**: 전역 EPS 대신 env별 허용오차(webkit은 서브픽셀 불안정으로 gapTop 2). 저장은 정수 반올림 말고 비교 시점에 반올림해 이중 반올림 경계 오차 제거.

### baseline (Phase 3)
- **in-place base 캡처**: 격리 워크트리를 버리고 `git stash` 또는 `git checkout <base> -- <paths>`로 제자리 캡처해 기존 `node_modules`·`.env` 재사용. (병렬이 필요하면 워크트리 + deps 심링크지만 pnpm 중첩 스토어라 취약 — 기본은 in-place.)
- **캐시키 = `<base-sha>__<lockfile-hash>`**: `pnpm install`로 의존성이 바뀌면 같은 SHA라도 렌더가 달라진다. 레지스트리 해시도 포함.
- **레지스트리 재조정**: `if exists(dir) return` 금지. 현재 레지스트리의 `(시나리오×env)` 중 base dir에 없는 것만 추가 캡처. 새 시나리오가 조용히 미검사되는 구멍 차단.
- **merge-base 기준 = `origin/main`**: 로컬 `main`이 뒤처지면 고대 baseline을 잡아 전부 오탐. trunk에서 작업 중(HEAD==base)이면 "trunk에선 게이트 불가"를 **명시 메시지**로(조용한 통과 금지).
- **단일 prune → LRU N개**: 브랜치/rebase/멀티 워크트리에서 서로의 캐시를 지워 재렌더를 유발하는 걸 막는다. 관심사는 정확성이 아니라 디스크 상한이므로 LRU가 맞다.
- **동시성 네임스페이싱**: `current/<runid>/`, 워크트리 `tmp-<runid>`, 임시 dir → `rename`으로 원자적 publish, base 캡처에 advisory lock.

### 훅 / 실패 UX
- **인프라·flaky 실패 = loud-pass**(요란하게 통과), stable하게 판정된 회귀만 `exit 1`. in-loop 에이전트가 게이트를 버리지 않게.
- **미수렴 env는 요약에 count+이름 노출**: "unstable = pass"가 조용히 커버리지를 갉아먹으므로, 판정 못 한 env를 사람/에이전트가 보게.

## 테스트 계획

- **순수**: 레지스트리 로더, 시나리오×env 확장, envs 교집합, (Phase 3) merge-base·캐시키 생성.
- **통합**: Phase 1 — 실제 A층 위반(가로 오버플로)을 심어 잡는지, 깨끗하면 0. Phase 3 — 브랜치 시나리오로 base 캡처→소스 회귀 편집→소스 좌표로 잡는지, no-op 깨끗, webkit 네임스페이스 격리.

## 리스크

- webkit 캡처 run-to-run 불안정(폰트 힌팅). self-compare로 완화되나 base와 working이 다른 Vite 프로세스라 완전 동일 파이프라인은 아니다 → in-place 캡처가 이걸도 줄인다.
- `?__fixture=` 계약은 아직 코드에 없다(레포에 `__fixture` 문자열 부재). Phase 2가 설계할 load-bearing 메커니즘이므로 그전에 레지스트리 스키마를 굳히지 않는다.
- A층만으로는 baseline 회귀(의도 밖 미묘한 시프트)를 못 잡는다 — 그건 Phase 3의 몫. MVP는 절대 규칙 커버리지만 약속한다.
