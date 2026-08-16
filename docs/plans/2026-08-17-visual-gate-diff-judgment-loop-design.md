# Visual gate — diff→판정 루프 설계 (B층의 심장)

날짜: 2026-08-17
브랜치: `BumgeunSong/visual-gate`
선행: `2026-08-13-visual-gate-baseline-env-design.md` (baseline·환경), `2026-08-12-dom-diff-matcher-plan.md` (diff 엔진), `2026-08-09-visual-regression-gate-mvp.md`

## 이 문서가 뒤집는 전제

선행 설계는 순서를 A층 게이트 먼저로 잡았다. 그 순서는 지금도 옳다. A층은 baseline 없이 값을 내므로 먼저 짓는 게 맞았고, Phase 2에서 `?__fixture=`로 진짜 상태 페이지까지 올라왔다.

그런데 A층을 실제 화면에 써보니 한계가 구조적이다. 절대 규칙은 4개(가로 오버플로 / 인터랙티브 뷰포트 이탈 / 고정 겹침 / 텍스트 클립)뿐인데, 현실 회귀의 공간은 열려 있다. 색이 틀리고, 간격이 좁아지고, 요소가 어긋나고, 폰트가 줄고, 20px 밀린다. 규칙을 하나 더 써도 한 조각만 덮고 꼬리는 남는다. 규칙이 답하는 질문은 "이 렌더가 유효하지 않은가"인데, 대부분의 실제 버그는 완벽히 유효한 렌더가 그냥 틀린 경우다.

그래서 게이트의 심장을 baseline diff로 옮긴다. diff는 절대 규칙과 달리 특정 규칙 목록에 갇히지 않고 모든 변경을 잡는다. 이게 커버리지 문제를 정면으로 푼다.

대신 diff는 반대편 문제를 떠안는다. 모든 변경을 잡으므로, 회귀뿐 아니라 방금 내가 의도한 편집도 잡고 비결정 노이즈도 잡는다. 스냅샷 테스트가 산업 전반에서 `--update-all` 근육기억으로 썩는 이유가 정확히 이거다. diff가 전부에 발화하면 사람도 에이전트도 무지성 수락을 학습하고 게이트는 조용히 죽는다.

정리하면 문제를 없앤 게 아니라 옮겼다.

```
절대 규칙:  어려운 문제 = "규칙을 충분히 열거하기"      (커버리지)
baseline diff:  어려운 문제 = "발화한 diff가
                 회귀인가 의도인가 판정하기"            (판정)
                + "비결정 churn 억제"                   (노이즈)
```

노이즈 절반은 이미 이겼다. DOM 트리 diff가 픽셀 diff보다 나은 지점이 이거고(안티에일리어싱·폰트 힌팅 churn 없음), 결정성 작업(시계·RNG 동결, `roundTree`, N=3 안정, `data-vg-ready`)이 그 토대다. **판정 절반이 미해결이고, 이 실험이 사느냐 죽느냐가 거기 달렸다.** 이 문서는 그 판정 루프를 설계한다.

## 이미 있는 것 vs 없는 것

```
CAPTURE          matchTrees          판정              verdict + baseline
gate.mjs    →    treematch.mjs   →   (없음)       →    (없음)
(완성)           (완성)
```

`matchTrees(baseline, current)`는 이미 의미 있는 delta를 낸다: `{ changed, moved, added, removed, ambiguous }`, 각 노드에 `sourceId` 부착. identity(tag/role/contractKey/shape/text)와 metric을 분리해 저장하므로 스타일 변경이 매칭을 깨지 않는다. 즉 diff 엔진은 완성이다.

없는 것은 diff 다음 전부다. baseline 저장소가 없고, delta를 verdict로 바꾸는 판정이 없다. 지금 `diff.mjs`는 delta를 출력만 하고 verdict도 exit code도 없다.

## 핵심 아이디어: 소스 없는 변경은 회귀다

판정은 delta 하나당 질문 하나로 환원된다.

> 저자의 코드 변경이 이 DOM 변경을 설명하는가?

두 반쪽 모두 기계가 읽을 수 있는 형태로 이미 있다.

- **소스 diff**: `git diff`가 건드린 `file:line` 집합을 준다(저자가 `MentionableInput.tsx`를 편집).
- **DOM diff**: 변경된 각 노드가 `sourceId = file:line:col`을 지닌다. 실측 확인함, 예: `src/comment/components/MentionableInput.tsx:134:6`.

둘을 교차한다.

| DOM 노드 변경? | 그 소스 파일 건드림? | 분류 |
|---|---|---|
| 예 | 예 | **explained** (설명됨): 의도, 허용 |
| 예 | **아니오** | **unexplained** (설명 안 됨): 회귀의 지문 |

unexplained 행이 전부다. 버튼 색을 바꿨으면 버튼의 소스 줄도 바뀌었으니 explained다. 그런데 그 변경이 등록 버튼을 화면 밖으로 밀었다면, 등록 버튼의 DOM은 바뀌었는데 그 소스 파일은 건드린 적이 없으니 unexplained다. 이게 원격작용(spooky action at a distance)이다. 타입체크와 유닛 테스트가 못 보는 바로 그 회귀 클래스를, 무엇이 밀렸는지 소스 좌표까지 짚어서 기계적으로 잡는다.

완전히 결정적이므로 게이트 안에 든다. 선행 설계의 결정(`결정적층 = 게이트, VLM은 밖`)과 일관된다.

## 3단 verdict

unexplained라고 다 같은 죄가 아니다. 잔여를 등급으로 나눈다.

- **Tier 1 — BLOCK (결정적, 고신뢰).** current에는 있고 baseline에는 없는 **새** 절대 규칙 위반(오버플로/화면밖/겹침/클립). 의도와 무관하게 틀렸다. 이건 A층인데 **차분(differential)** 으로 만든다. 기존에 있던 오버플로는 무관한 변경을 더 이상 막지 않는다.
- **Tier 2 — REVIEW (표면화, 기본 비차단, loud-pass).** 절대 규칙 위반은 아니지만 unexplained인 delta: 소스를 안 건드렸는데 노드가 이동/변경/등장했다. 소스 귀속과 함께 표면화한다. 기계적 교차가 판정 못 한 이 잔여를 아래 "잔여를 에이전트에게 물을 때"의 프로토콜로 되묻는다. 기본은 warn이지 루프를 오차단하지 않는다.
- **Tier 3 — PASS (승격 가능).** 모든 delta가 건드린 파일로 설명되고 새 위반이 없다. `current → baseline` 승격을 제안한다.

여기서 A층에 무슨 일이 일어났는지 보라. 절대 규칙은 주 메커니즘이 될 수 없다는 진단이 옳았다. 이 설계에서 절대 규칙은 diff 잔여에 대한 이차 고신뢰 분류기로 강등된다. 더 작고 정직한 역할이다. baseline diff가 주력이고, 절대 규칙은 설명 안 된 꼬리만 판정한다.

## 판정기 (심장, 의사코드)

```javascript
function judge({ baseline, current, touchedFiles }) {
  const deltas = matchTrees(hashTree(baseline.tree), hashTree(current.tree));

  // explained = 노드 자신 OR 조상 중 하나가 저자가 편집한 파일로 매핑.
  // 조상-cascade는 의도적: 컨테이너를 편집하면 그 서브트리가 정당히 reflow하므로
  // 그 자식 이동들은 부모 편집으로 설명된다.
  const isExplained = (node) =>
    touchedFiles.has(fileOf(node.sourceId)) ||
    node.ancestors.some((a) => touchedFiles.has(fileOf(a.sourceId)));

  const unexplained = allChangedNodes(deltas).filter((n) => !isExplained(n));

  // Tier 1: 차분 A층 — 기존이 아니라 NEW 위반만.
  const newViolations = subtractViolations(current.violations, baseline.violations);

  if (newViolations.length) return { tier: 'BLOCK', newViolations, unexplained };
  if (unexplained.length)   return { tier: 'REVIEW', unexplained };
  return { tier: 'PASS', deltas };
}
```

의도적 견고성 선택 둘.

- **파일 단위, 줄 단위 아님.** 코드가 이미 경고한다: `sourceId`의 줄 번호는 위쪽 코드가 편집되면 밀린다. 그래서 파일로 교차한다(줄 드리프트에 면역). 줄 범위는 선택적 강화다. 드리프트는 언제나 더 explained(더 관대)로만 기울지, 거짓 회귀를 만들지 않는다. 위험 방향이 누락이지 오탐이 아니다.
- **조상-cascade가 reflow를 설명한다.** flex 컨테이너를 편집하면 자식이 정당히 움직인다. 그건 조상을 통해 explained지 flag가 아니다. 건드린 조상이 없는 이동만 unexplained다.

### 파생 스코프가 선언 스코프를 이긴다

스코프를 정하는 방법은 둘이다. 에이전트가 "나는 X만 바꾼다"를 선언하게 하거나(선언 스코프), 실제 `git diff`에서 건드린 파일을 뽑거나(파생 스코프). 이 설계는 파생을 택한다. 근거는 실측이다: 채점 기준을 프롬프트에 노출하면, 채점을 통과하는 답이 아니라 채점에 안 걸리는 답이 나온다. 스코프 선언을 쓰는 주체에게 스코프 판정 규칙을 보여주면 스코프가 넓어진다. 선언 스코프는 게임당한다.

파생 스코프는 이 함정에 면역이다. 스코프가 자기보고가 아니라 실제 코드 diff에서 나오므로, 에이전트가 스코프를 부풀리려면 코드를 실제로 안 건드린 척할 수 없다. 판정 규칙을 에이전트에게 숨기는 게 아니라, 판정 입력 자체를 에이전트의 서술이 아닌 기계가 읽는 사실(git diff × sourceId)로 둔다.

## 잔여를 에이전트에게 물을 때 (Tier 2 판정 프로토콜)

기계적 교차(git diff × sourceId)가 못 가른 잔여는 Tier 2로 떨어진다. 절대 위반은 아니지만 unexplained인 비구조 delta다. 이걸 누구에게, 어떻게 묻느냐로 결과가 갈린다. 실측에서 확인한 것 넷을 프로토콜로 박는다.

- **질문을 뒤집는다.** "의도대로 됐는지 확인해"는 정보량이 0이다. 에이전트는 이미 성공했다고 믿고 작업을 끝냈으므로 그렇다고 답한다. 대신 "이 변화 중 당신 지시로 설명되지 않는 것을 나열하세요"로 묻는다. 그러면 자기가 안 건드린 화면이 같이 움직였다는, 자기 표상 안에 없던 사실이 나온다.
- **통과 라벨을 주지 않는다.** `ok`/`pass`가 아니라 `expected` / `unplanned` / `unexplained` 셋뿐이고 `unexplained`가 기본값이다. 에이전트에게 통과를 선언할 권한을 주지 않고, 설명하거나 못 하거나만 말하게 한다.
- **채점 기준을 노출하지 않는다.** unexplained가 곧 차단이라는 규칙을 에이전트에게 보여주면, 채점을 통과하는 답이 아니라 채점에 안 걸리는 답이 나온다. 위 파생 스코프 원리와 같은 실패다. 게이트의 분류 규칙은 에이전트에게 숨기고, delta 목록만 blind로 넘겨 귀속만 받는다.
- **자기 세션이 남보다 낫다(반직관).** 에디터 교체에서 높이가 18px 줄어든 부작용을, 그 작업을 한 세션은 `unplanned`로 정확히 찍었고 컨텍스트 없는 판정자는 `expected`로 흘렸다. 이유: 자기는 자기가 안 한 일을 안다. "나는 높이를 건드린 적 없다"를 불가능성 근거로 쓴다. 남은 diff만 보는 판정자는 "에디터를 바꿨으면 높이도 바뀔 만하지"로 합리화한다. 작업 요약을 넘겨줘도 따라잡지 못했고 오히려 나빠졌다. 그러므로 Tier 2 판정은 **작업한 그 세션 안에서 in-loop로** 하지, 새 판정자를 스폰하거나 요약을 핸드오프하지 않는다. (변경 다섯 건 규모의 일화지 통계는 아니다.)

이게 "gate over prompt"와 모순 아닌 이유(핵심 구분): 게이트가 거부하는 건 성공의 자기보고("됐어? 응")다. 그건 평가라 합리화된다. 여기서 받는 건 **행동 경계의 자기보고**("나는 높이를 안 건드렸다")다. 그건 자기 행위 이력에 대한 사실 진술이라 정보다. 세 라벨 체계가 이걸 강제한다: 에이전트는 결코 `pass`를 말하지 않고, 변화를 자기 행위에 귀속하거나 귀속 실패만 선언한다. 자기 지식은 편향의 원천이 아니라 정보의 원천으로만 쓰인다. 그리고 이 채널은 기계적 교차가 못 가른 잔여에만 쓰는 보조지, 주 판정은 여전히 diff × sourceId다.

## baseline 저장소 + 승격 (썩음 방지 절반)

스냅샷 테스트가 썩는 이유는 무지성 `--update-all`이다. 그걸 끊는다.

| 관심사 | 설계 |
|---|---|
| baseline 위치 | `visual-gate/baseline/<scenario>-<env>.json`, 레포에 커밋(env당 하나: E0/E1/E2/E4). |
| 첫 실행(baseline 없음) | 게이트가 **기권**(loud-pass)하고 seed 제안. seed는 명시적 수락이지 자동 아님. |
| 승격 | `node visual-gate/accept.mjs <scenario>`가 current → baseline을 쓴다. 단 게이트가 Tier 3로 판정한(또는 명시 리뷰한 Tier 2) 캡처만. Tier 1 block 위로는 승격 불가. |
| 무지성 아님 | 승격이 먼저 explained-delta 목록을 출력한다. 서술된 변경을 수락하지 블랙박스가 아니다. |

선행 설계는 baseline을 로컬 per-dev gitignore로 뒀다(폰트/OS 결정성 우려). 이 문서는 그걸 **레포 커밋**으로 뒤집는다. 근거: DOM 트리 캡처는 이미 byte-identical로 검증됐고(픽셀이 아니라 폰트 힌팅 무관), env가 chromium 고정이라 머신 간 트리가 안정적이다. 커밋 baseline이라야 승격이 코드리뷰 대상이 되고 팀 전체를 지킨다. per-dev gitignore는 self-compare 편의는 있으나 공유 불가라 게이트가 개인 캐시로 갇힌다. webkit(E5)을 들일 때 폰트 힌팅이 트리에 새면 그때 per-env 정책을 재검토한다.

## 두 워크드 예제

**의도: 버튼 색을 보라로.** 소스 diff가 `CommentActions.tsx`를 건드림. DOM diff: `changed` 노드 하나 `button color rgba(37,99,235) → rgba(124,58,237)`, sourceId `CommentActions.tsx:44:6`. 파일 건드림 → explained. 새 위반 없음 → Tier 3 PASS, 승격 제안.

**회귀: prove-value 실험의 min-width 오버플로.** 소스 diff가 `MentionableInput.tsx`만 건드림. E2(320px)에서 DOM diff: 등록 버튼 `moved` + `interactive-outside-viewport` at `[392,408]`. 버튼 sourceId는 건드린 파일 안이지만, **baseline에 없던 새 절대 위반** → Tier 1 BLOCK. 설령 안 건드린 파일이었어도 Tier 1이다(절대 위반이 explained/unexplained 축을 이긴다). 어느 쪽이든 잡힌다.

## 구현 단계 (원자 커밋, 각 커밋이 게이트 green 유지)

1. `feat`: `baseline/` 저장소 + `loadBaseline(scenario, env)` + 부재 시 seed 기권.
2. `feat`: 차분 A층 — `subtractViolations(current, baseline)`로 NEW 위반만 계수.
3. `feat`: `git diff --name-only`에서 `touchedFiles` + `sourceId`→file 매핑(줄 드리프트 주의 문서화).
4. `feat`: `judge()` 판정기 + 3단 verdict, `check.mjs` exit code 배선(Tier 1 → exit 1; Tier 2/3 → 0, loud-pass). Tier 2 잔여는 `unexplained` 라벨로 소스 귀속과 함께 출력만 한다(게임 방지 위해 분류 규칙 비노출). 잔여의 자기 판정은 위 프로토콜대로 작업 세션이 in-loop로 소비하지, 게이트 코드가 자동 판정하지 않는다.
5. `feat`: `accept.mjs` 승격, non-Tier-1 게이팅, 쓰기 전 delta 출력.
6. `test`: 판정기 유닛 테스트(explained/unexplained/cascade/차분-위반) — 순수, node:test.

가장 얇은 엔드투엔드 슬라이스는 1+3+4(baseline 저장소 + touchedFiles + judge)다. 이것만으로 실제 회귀에 돌려볼 수 있다.

판정 루프가 서면, 다음 커버리지 투자는 규칙이 아니라 **픽스처 상태 축**이다(위 커버리지 절: 5/13 → 11/13의 지렛대). comments-long-thread 한 화면을 정상·극단·빈·로딩·에러 상태로 늘리는 게 A층 규칙 추가보다 훨씬 많이 잡는다.

## 이 게이트가 실제로 몇 개나 잡나 (커밋 이력 역산)

DWF 이력에서 시각 결함으로 되돌리거나 고친 커밋은 32건이다. 그중 상당수는 결정적 Playwright E2E가 이미 잡는 영역이다(클릭 안 먹힘, 화면 안 뜸, 라우팅 틀림). 게이트의 범위를 E2E로는 단언할 수 없는 순수 시각 결함으로 좁히면 분모가 13이 된다.

| 구성 | 잡히는 수 |
|---|---|
| 보편 규칙만 (오버플로·이탈·겹침·잘림·대비) | 5 / 13 |
| + 앱 고유 규칙 + 상태 시나리오(로딩·에러·빈·극단 콘텐츠) | 11 / 13 |

**커버리지를 올리는 단 하나의 지렛대는 상태 시나리오였다.** 규칙을 더 쓰는 것보다 같은 화면을 더 많은 데이터 상태에서 렌더하는 게 훨씬 많이 잡는다. 이게 이 문서의 전제(baseline diff + 픽스처 > 절대 규칙)를 이력으로 재확인하고, 판정 루프 다음의 투자 방향도 정한다: A층 규칙을 늘리지 말고 **픽스처 상태 축(정상·극단·빈·로딩·에러)을 늘려라.** 그 축이 장식이 아니라 커버리지의 주력이다.

조합은 돌리지 않는다. 기본 픽스처에서 환경 전부, 기본 환경에서 픽스처 전부. (선행 설계의 "환경을 곱하지 말 것" 결정을 픽스처 축으로 확장.)

## 사람이 남는 자리 (게이트가 못 잡는 것)

새 디자인이 아름다운가, 카피가 자연스러운가, 의미가 옳은가는 회귀가 아니라 창작 판단이라 결정적 게이트 밖이다. 그리고 baseline이 처음부터 틀리면 게이트는 그 오류를 영구 보존한다(쓰레기 baseline → 영원히 쓰레기). 그래서 baseline 승인은 사람의 일로 남는다. 게이트는 회귀를 막지, 좋은 디자인을 만들지 않는다. 승격당 delta 리뷰(위 baseline 절)가 이 사람 자리를 최소한으로 지키는 장치다.

## 설계 다이얼 & 리스크

- **스코프 입도**(file / line / 조상-cascade). 오탐률을 가장 크게 좌우하는 다이얼. 기본은 file + cascade, 너무 관대하면 그때 조인다.
- **Tier 2 차단 정책.** warn(기본, 루프 보호) vs strict-block(원격 회귀를 잡지만 정당한 전역 리팩터를 막을 위험). per-run 플래그.
- **`sourceId` 줄 드리프트.** 파일 단위 매칭으로 완화. 잔여 위험은 관대함이지 오탐 아님.
- **baseline 노후화.** 작은 승격이 쌓여 baseline이 드리프트할 수 있다. 승격당 delta 리뷰가 방어선이지만, 사람이 실제로 diff를 읽어야 성립한다.
- **소스 diff 부재 케이스**(데이터 주도 변경, 의존성 범프). 모든 게 unexplained가 된다. 잔여에 A층 + 판정층으로 폴백. 여전히 동작하되 신호가 약하다.

## 한 줄 요약

matchTrees가 탐지기, `git diff × sourceId`가 판정자, 차분 A층이 고신뢰 백스톱, VLM/사람은 애매한 꼬리만 만진다. 이게 실제 변경에 돌릴 루프다.
