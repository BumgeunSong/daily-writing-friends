# Visual gate — baseline 관리와 환경 매트릭스 설계

날짜: 2026-08-13
브랜치: `BumgeunSong/visual-regression-gate` (PR #749)
선행: `2026-08-12-dom-diff-matcher-plan.md` (diff 엔진), `2026-08-09-visual-regression-gate-mvp.md`

## 목적

diff 엔진(treematch + A층 절대 규칙 + data-vg 소스 귀속)은 완성·검증됐다. 남은 세 가지를 이 문서가 확정한다.

1. 무엇을 기준으로 비교하나 — baseline
2. 어떤 화면·환경을 검사하나 — 시나리오와 환경 매트릭스
3. 언제 도나 — 생명주기

관통 철학: in-loop(에이전트가 자기 회귀를 스스로 검증), gate-over-prompt(외부 결정적 게이트), 그리고 **시각 검증이지 행동 검증이 아니다**.

## 확정된 결정 (브레인스토밍 산물)

1. **baseline 저장 = 로컬 per-dev, 재생성, gitignore.** 같은 머신이 자기 자신과 비교하므로 개발자별 폰트/OS 차이가 원천적으로 안 생긴다. 공유 저장소도 CI 게이트도 아니다.
2. **baseline 기준점 = `git merge-base HEAD main`.** feature 브랜치가 갈라진 커밋 = 태스크 시작점. 에이전트가 시작 시점을 기억할 필요가 없고, 커밋마다 안 움직이며, rebase로 base가 이동하면 자동 갱신된다.
3. **캡처 = SHA 메모이즈 일회용 워크트리.** base 캐시가 없을 때만 렌더한다. 워킹트리가 깨끗하고 `HEAD == base`면 현재 dev 서버로 직접 캡처, 아니면 `git worktree add <base>` + 일회용 서버로 캡처 후 워크트리 제거. base SHA로 메모이즈하므로 실제 렌더는 브랜치당 1회(또는 base가 움직일 때만).
4. **생명주기 = pre-commit 게이트.** 영구 baseline store도 post-commit 훅도 없다. `check`가 필요한 dev 서버를 스스로 부팅·정리한다.
5. **시나리오 단위 = URL로 주소지정되는 렌더 상태.** 컴포넌트가 아니다. 한 페이지의 상태별 차이(populated/empty/error)는 각각 별개 시나리오이며 `?__fixture=` 파라미터로 **정적으로** 도달한다. 상태에 클릭·입력을 스크립트로 몰아 도달하지 않는다(그건 행동 검증). 무엇을 검사할지는 커밋되는 레지스트리가 정한다.
6. **환경 = E0/E1/E2/E4 + E5.** 브라우저는 비교 축이 아니라 평행 baseline 네임스페이스. 크로스브라우저 비교 금지.
7. **MVP 레지스트리 = 컴포넌트 하네스 URL.** 실제 앱 라우트를 MSW로 렌더하는 경로는 다음 층으로 분리.

## 파일 체계

```
.visual-gate/
  scenarios.json            # 커밋됨. 무엇을 검사하나 (name → url + envs). 큐레이션 그 자체
  baselines/<base-sha>/      # gitignore. 재생성. 기준점 캡처
    <name>__<env>.json
  current/                   # gitignore. 워킹트리 임시 캡처
```

핵심 구분: **`scenarios.json`은 소스**(공유·버전관리 대상, "무엇을 검사하나"), **`baselines/`는 로컬 산출물**(재생성, "그 시점에 어떻게 보였나"). 레지스트리는 팀이 공유하고 baseline은 각자 머신에서 뜬다.

### scenarios.json 스키마

```json
{
  "scenarios": [
    { "name": "comment-input",  "url": "/visual-gate/index.html?component=mentionable", "envs": ["E0","E1","E2","E4","E5"] },
    { "name": "reply-input",    "url": "/visual-gate/index.html?component=replyInput",  "envs": ["E0","E1"] }
  ]
}
```

- **env를 시나리오별로 선언**한다. 모든 시나리오에 5환경을 곱하지 않는 것이 비용을 잡는 레버.
- 슬롯을 얻는 기준: 그 화면에서 시각 회귀가 배포되면 아플 만한가. 축은 트래픽 × 상태의 시각적 하중 × 시각버그 이력. 버그가 났던 상태를 발견하면 시나리오로 추가한다(환경 E9 누적기와 같은 정신).
- 명시적 제외: 모든 순열, 그리고 행동으로만 다른 상태(시각 하중이 없으면 뺀다).

## 데이터 흐름

```
ensureBaseline():
  base = `git merge-base HEAD main`
  dir  = .visual-gate/baselines/<base>/
  if exists(dir): return base            # 메모이즈
  scenarios = read scenarios.json
  if cleanTree() and HEAD == base:
    capture(scenarios, server=현재 dev 서버) → dir
  else:
    wt = `git worktree add <tmp> <base>`
    try: boot 일회용 Vite(ephemeral port); capture(scenarios, server=일회용) → dir
    finally: `git worktree remove --force <tmp>`
  prune baselines/ except <base>

check():                                  # pre-commit 진입점
  base = ensureBaseline()
  boot 워킹트리 dev 서버 (없으면)
  cur = capture(scenarios, server=워킹트리) → .visual-gate/current/
  regressions = []
  for each (scenario, env):
    b = load baselines/<base>/<name>__<env>.json
    c = load current/<name>__<env>.json
    if b.stable == false or c.stable == false: continue   # 판정 불가, 회귀 아님
    r = treematch(hashTree(b.tree), hashTree(c.tree))
    newViolations = c.violations - b.violations           # A층: 새로 생긴 위반만
    if r.changed|moved|added|removed or newViolations: regressions.push(...)
  teardown 부팅한 서버
  print report; exit(regressions.length ? 1 : 0)
```

캡처 단위는 기존 `gate.mjs`의 env 루프를 재사용하되, 시나리오(URL)마다 반복하고 env마다 올바른 브라우저 타입을 론치한다.

## 환경 매트릭스

| id | 축 | 브라우저 | 노리는 결함 |
|----|----|---------|-----------|
| E0 | 기준선 390·light | chromium | — |
| E1 | dark | chromium | 대비 미달, 색 하드코딩 |
| E2 | 320 | chromium | 가로 오버플로 |
| E4 | 1280 | chromium | 반응형 분기 |
| E5 | webkit(390·light) | webkit | iOS 전용 렌더 차이 |

- baseline 캡처와 워킹트리 캡처는 **동일 env**로 뜬다 → 네임스페이스 안에서만 비교.
- 시나리오가 선언한 `envs`와 이 매트릭스의 교집합만 캡처한다.
- 보류: E3 태블릿, E6 Firefox, E7 standalone(safe-area, 별도 스파이크 필요), E8 텍스트200%, E9 버그조합 누적기(메커니즘만 자리 잡아둠).

## 엣지 케이스

- **merge-base 실패**(main 없음 / detached HEAD / 얕은 클론): 게이트를 막지 않고 명확한 메시지로 skip. 게이트가 인프라 문제로 커밋을 막으면 안 된다.
- **미수렴 캡처**(stable=false): 회귀가 아니라 판정 불가. 차단하지 않는다.
- **일회용 워크트리**: 실패 경로에서도 `finally`로 `git worktree remove --force`. 포트는 ephemeral로 충돌 회피.
- **픽스처 없는 URL / 렌더 실패**: 명확한 에러로 표면화(조용한 통과 금지).
- **pre-commit 속도**: MVP는 레지스트리 전체를 돈다. 느리면 변경 파일 → 영향 시나리오 스코프가 후속.

## 단계

- **Phase 0** — 레지스트리 로더 + 시나리오×env 확장 + envs 교집합 (순수 함수, 단위 테스트).
- **Phase 1** — `ensureBaseline`: merge-base 해석, SHA 메모이즈, 일회용 워크트리 캡처, 프루닝.
- **Phase 2** — `check`: baseline vs 워킹트리, 시나리오·env별 treematch + A층 신규 위반, exit code.
- **Phase 3** — E5 webkit env + env별 브라우저 타입 론치.
- **Phase 4** — husky pre-commit 배선 + check의 자립 서버 부팅·정리.
- **Phase 5 (보류)** — 실제 라우트 MSW 렌더, 변경파일→시나리오 스코프, 픽셀 축, E7 standalone.

## 테스트 계획

- **순수**: merge-base 해석, 캐시 키 생성, 시나리오×env 확장, envs 교집합.
- **통합**: 브랜치 시나리오 하나로 base 캡처 → 실제 소스 회귀 편집 → check가 소스 좌표로 잡는지, no-op는 깨끗한지, webkit 네임스페이스가 chromium과 안 섞이는지.

## 리스크

- webkit 캡처 결정성(폰트 렌더). 같은 머신 self-compare라 완화되나 flaky 가능 → 수렴 루프로 판정 불가 처리.
- baseline 캐시 비대 → base SHA 프루닝으로 억제.
- 컴포넌트 하네스만으로는 라우트 레이아웃 회귀 커버리지가 제한된다(설계상 알려진 한계, Phase 5가 메움).
