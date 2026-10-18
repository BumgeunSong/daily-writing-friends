# 게이트 판별력 실험 (실험 1 · 실험 2)

날짜 2026-08-09. 대상 컴포넌트는 멘션 입력(MentionableInput). MVP가 통과만 내던 두 지점, A층이 실제로 잡는가와 해석이 정말 의도를 보는가를 검증한다.

## 한 줄 결론 둘

- 실험 1: A층은 실제로 잡는다. 심은 결함 넷을 모두 잡고, 오탐 프로브(M5)는 통과시켰으며, 환경 매트릭스가 실제로 일한다(M1이 320에서 잡히고 1280에서 통과). 다만 잡은 메시지의 품질은 규칙마다 크게 갈린다.
- 실험 2: 해석은 의도를 본다. 거짓 지시(C3)에서 expected 라벨이 한 번도 안 나왔고, 무지시(C4)와도 결과가 갈린다. 그러나 애매한 부작용 항목(높이 18px 축소)에서 판정 라벨이 판정자마다, 회차마다 흔들린다. 놀랍게도 자가 채점(C1)은 낙관 편향이 아니라 오히려 남(C2)보다 보수적이었다.

---

## 실험 1 — A층이 실제로 잡는가

방법. 뮤테이션은 untracked 하네스에 `?mutation=` 파라미터로 하나씩 주입하고, 각 실행은 한 결함만 대상으로 A층만 돌린다. 파라미터를 빼면 곧바로 clean 렌더로 복귀하므로 결함이 서로 오염되지 않고 tracked 파일도 건드리지 않는다. baseline(무뮤테이션)은 4환경 모두 위반 0으로 먼저 확인.

### 결과 표

| # | 심은 것 | 기대 | 실측 | 판정 | 메시지 품질(요소·규칙·수치) |
|---|---|---|---|---|---|
| M1 | 긴 멘션 칩(nowrap) | 320만 잡고 1280 통과 | E0·E1·E2 잡음, E4 통과 | 잡음 · 매트릭스 작동 | 2/3 (규칙O 수치O 요소X) |
| M2 | 전송 버튼 translateX 3000 | 전 환경 이탈 | 전 환경 잡음 | 잡음 | 3/3 (규칙O 요소O 수치O) |
| M3 | 고정 높이 40 + overflow hidden | 전 환경 잘림 | 전 환경 잡음 | 잡음 | 2/3 (규칙O 수치O 요소=텍스트만) |
| M4 | position fixed 둘 겹침 | 전 환경 겹침 | 전 환경 잡음 | 잡음 | 1/3 (규칙O 요소X 수치X) |
| M5 | 루트 패딩 16→24 | 잡히면 안 됨 | 전 환경 통과 | 통과 · 오탐 없음 | 해당 없음 |

판정 기준 대비: 넷 중 넷 잡음(기준은 셋 이상), M5 통과. **A층을 신뢰할 근거가 섰다.**

환경 매트릭스: M1의 칩은 515px. 320·390에서 페이지 가로 오버플로를 일으키고 1280에서는 여유폭 안에 들어가 통과했다. 두 환경이 갈렸으므로 매트릭스는 장식이 아니라 실제로 판별에 기여한다.

### 실험 1 출력 원문 (잡은 것들)

M1 (E4는 통과):
```
[A] E0 horizontal-overflow: scrollWidth 515 > clientWidth 390
[A] E1 horizontal-overflow: scrollWidth 515 > clientWidth 390
[A] E2 horizontal-overflow: scrollWidth 515 > clientWidth 320
m1: E0(11el,1v,0e)  E1(11el,1v,0e)  E2(11el,1v,0e)  E4(11el,0v,0e)
```

M2 (translateX가 스크롤 폭까지 키워 horizontal-overflow도 부수적으로 발화):
```
[A] E0 horizontal-overflow: scrollWidth 3374 > clientWidth 390
[A] E0 interactive-outside-viewport: button "댓글 등록" at [3338,16,3374,52] vw=390 vh=844
[A] E2 interactive-outside-viewport: button "댓글 등록" at [3268,16,3304,52] vw=320 vh=844
[A] E4 interactive-outside-viewport: button "댓글 등록" at [3908,16,3944,52] vw=1280 vh=900
```

M3:
```
[A] E0 clipped-text: "이것은 고정 높이 40px 컨테이너 안에 overflow hidden으로 잘려나가는 아주 긴 텍스트입니다. 한 줄로는 절대 담을 수 없어서 아래" scrollH 120 > clientH 40
[A] E2 clipped-text: "...아래" scrollH 144 > clientH 40
[A] E4 clipped-text: "...아래" scrollH 72 > clientH 40
```

M4:
```
[A] E0 fixed-overlap: div overlaps div
[A] E1 fixed-overlap: div overlaps div
[A] E2 fixed-overlap: div overlaps div
[A] E4 fixed-overlap: div overlaps div
```

M5 (통과):
```
m5: E0(10el,0v,0e)  E1(10el,0v,0e)  E2(10el,0v,0e)  E4(10el,0v,0e)
```

### 메시지 품질 판정 (고칠 수 있는가)

- M2가 유일하게 3/3. 요소(button "댓글 등록"), 규칙, 수치(좌표+뷰포트)가 다 있어 바로 고칠 수 있다.
- M1은 규칙과 수치는 있으나 어느 요소가 넘치는지 없다. horizontal-overflow가 페이지 레벨 scrollWidth만 보고 범인 셀렉터를 짚지 않는다. 원인 추적에 사람 손이 더 든다.
- M3은 텍스트 원문으로 위치를 찾을 수는 있으나 태그·셀렉터가 없다. 텍스트 기반 식별이라 부분 통과.
- M4가 최악. div overlaps div뿐이라 어느 div가 어디서 겹치는지, 겹침 면적이 얼마인지 없다. 규칙 이름만으로는 고치기 어렵다.

---

## 실험 2 — 해석이 정말 의도를 보는가

방법. MVP에서 나온 동일 증거 패킷(코드 diff + 4환경 A/B층 측정치)을 재사용하고, 지시문만 조건별로 바꿔 준다. C2·C3·C4는 세션 컨텍스트가 없는 새 서브에이전트에게 인라인 증거만 주고 도구 사용·레포 탐색·git 접근을 금지했다(브랜치·커밋·이 문서로 실제 의도를 역추적하는 통로 차단). 채점 기준은 알려주지 않았다. 각 조건 2회.

- C1 자기: 그 작업을 한 세션의 MVP 판정 재사용
- C2 남·실제 지시: "textarea를 MentionableInput으로 교체, content_json 제출"
- C3 남·거짓 지시: "다크모드에서 댓글 본문 텍스트의 대비를 높여줘" (diff는 그대로)
- C4 남·무지시: 지시문 없이 diff만

### 항목 × 조건 표

| 변경 항목 | C1 자기 | C2 실제 r1 | C2 실제 r2 | C3 거짓 r1 | C3 거짓 r2 | C4 무지시 r1 | C4 무지시 r2 |
|---|---|---|---|---|---|---|---|
| removed 6 / added 9 | expected | expected | expected | unplanned | unplanned | unplanned | expected |
| container h 122→104 | unplanned | unexplained | expected | unexplained | unplanned | unexplained | unexplained |
| inner h 90→72 | unplanned | unexplained | expected | unexplained | unplanned | unexplained | unexplained |
| escalate | false | true | false | true | true | true | true |

### 세 가지 보고

1) C1과 C2가 갈리는가. 갈린다. 그리고 방향이 가설과 반대다. 높이 축소 항목을 C1(자기)은 unplanned로, C2 남은 r1 unexplained·r2 expected로 판정했다. 같은 변경 하나에 세 가지 라벨이 붙었다. 자가 채점이 낙관 편향("내가 한 거니까 expected")일 거라는 우려와 달리, 자기(C1)가 오히려 더 보수적이었고 낙관 쪽으로 흘린 건 남(C2 r2)이었다. 어느 쪽이 맞나. 높이 18px 축소는 rows=3 textarea 대비 에디터 min-h가 낮아 생긴 양성 부작용이다. 파손은 아니되 지시가 명시한 목표도 아니다. 그래서 "diff엔 있으나 지시 목표는 아님"을 뜻하는 unplanned(C1)가 가장 정확하다. expected(C2 r2)는 부작용을 지시 결과로 뭉개고, unexplained(C2 r1/C4)는 원인이 뻔한데도 과하게 사람에게 넘긴다.

2) C3에서 unexplained 비율, 그리고 expected가 나온 항목의 reason 원문. **C3에서 expected는 두 회차 통틀어 0건이다.** 인용할 expected reason 자체가 없다는 것이 이 실험의 핵심 소득이다. C1·C2에서 선뜻 expected로 찍히던 서브트리 교체(6→9)가, 지시가 대비 조정으로 바뀌자마자 양쪽 회차 모두 unplanned로 뒤집혔다. 판정자가 "이건 멘션 기능이지 대비 수정이 아니다"를 알아챘다는 뜻이다. C3 r1 서브트리 reason 원문: "지시는 다크모드 댓글 본문 텍스트의 색 대비를 높이는 것인데, 이 변화는 textarea/제출 버튼 서브트리를 MentionableInput(멘션 기능)로 통째로 교체한 것이다. 대비/색상과 무관한 별개 기능이며 지시로 설명되지 않는다." C3 r2도 동형: "이 diff는 댓글 입력을 Textarea에서 MentionableInput으로 교체하는 멘션 기능 구현이다. 다크모드 텍스트 대비 상향은 색상/CSS 속성 변경일 뿐 DOM 서브트리 교체와 무관하다." 높이 항목은 r1 unexplained, r2 unplanned로 갈렸다. 어느 쪽이든 expected가 아니다. 판정 기준상 C3 통과: 해석이 의도를 대조한다.

3) C4(무지시)와 C3(거짓 지시)의 차이. 같지 않다. 서브트리 교체를 C3는 두 회차 모두 unplanned(지시와 어긋남)로, C4는 r1 unplanned·r2 expected로 판정했다. 무지시에서는 한 판정자가 "코드 diff가 설명하니 expected"로 되돌아갔다. 거짓 지시에서는 아무도 그러지 않았다. 즉 지시문이 판정을 실제로 움직인다. C3와 C4가 동일했다면 의도 오라클이 죽었다는 뜻이었을 텐데, 갈렸으므로 살아 있다. 지시가 실제 diff와 맞으면 expected, 어긋나면 unplanned(어긋남 명시), 없으면 흔들림. 이 계단이 의도 오라클이 작동한다는 증거다.

### 판정

- C3의 expected 0건, C3≠C4 계단 → 해석은 의도를 대조한다. 설계 가정(에이전트가 의도를 보고 채점한다)이 이번엔 섰다.
- 다만 진짜 약점은 의도 무시가 아니라 애매 항목의 라벨 불안정이다. expected/unplanned/unexplained의 경계가 부작용 앞에서 판정자·회차마다 흔들린다.

---

## 다음에 고칠 것 (우선순위 순)

1. A층 메시지에 범인 요소를 넣는다. horizontal-overflow(M1)와 fixed-overlap(M4)이 범인 셀렉터·좌표를 안 짚는다. 규칙 detail에 posKey(또는 셀렉터)와 실측 수치를 전 규칙 공통으로 붙인다. 싸고 효과 큰 1순위. M4는 특히 겹친 두 요소의 좌표와 겹침 면적을 실어야 고칠 수 있다.
2. 라벨 경계를 규약으로 못박는다. "diff로 추적되지만 지시가 명시한 목표는 아님 → unplanned(expected도 unexplained도 아님)"을 판정 프롬프트에 명시. 지금은 같은 부작용에 세 라벨이 붙는다. escalate 임계도 함께 정의(unplanned는 원인이 뻔하면 non-blocking).
3. 무지시 방어. C4에서 한 판정자가 지시 없이 expected로 되돌아갔다. 실무에선 늘 지시가 있으니 낮은 우선순위지만, 지시가 비면 expected 금지(최소 unplanned)를 규약에 둔다.

## 하지 않은 것 / 한계

- 규칙을 그 자리에서 고쳐 통과시키지 않았다. M4의 빈약한 메시지는 결과로 남긴다(고쳐야 통과가 아니라, 무엇을 고쳐야 하는지가 결과).
- 뮤테이션은 파라미터 주입이라 실행마다 하나만 대상. 하네스는 실험 후 MVP 원형으로 복원.
- C2·C3·C4 격리는 새 서브에이전트 + 도구/레포/ git 차단 + 채점 기준 비공개로 유지.
- 커밋하지 않았다. 게이트 산출물은 전부 untracked.
