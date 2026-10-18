# DOM 속성 diff 매처 재설계 — 구현 plan

작성 2026-08-12 · 대상 `visual-gate/` B층 diff · 브랜치 `BumgeunSong/visual-regression-gate`

## 목적

시각 회귀 게이트 B층(before/after 기하 diff)의 **요소 매칭**을 프레임워크 중립적이고
결정적으로 다시 만든다. 매칭이 틀리면 그 뒤 속성 델타는 전부 그럴듯한 거짓이 되므로,
매칭 정확도가 게이트 신뢰성의 본체다.

핵심 전환: **React fiber 차용을 버린다.** fiber는 비공개 API(`__reactFiber$` 난수 접미사)
의존이고, `key={i}` 안티패턴에서 오히려 자신만만한 오귀속을 만들며, keyless 구간에선
posKey와 같은 시프트 취약점을 가진다. 대신 프레임워크와 무관하게 구조만으로 안정 매칭을
얻는 알고리즘(양끝 트리밍 + 머클 프루닝 + 앵커 분할정복)과, 매칭 불확실을 강제하지 않고
격리하는 수락 게이트를 채택한다.

## 이번 plan의 범위

포함:
- 레코드 스키마를 신원/측정/콘텐츠로 분리
- 상향식 해시 2종(exactHash 머클, shapeHash)
- 양끝 트리밍 + 계약키 + 앵커 분할정복 + 시퀀스 diff 매칭 파이프라인
- 수락 게이트(마진 기준) + `ambiguous` 5분류 출력
- 결정성: rAF 수렴 루프 + 렌더/추출 정규화 + 비교 허용오차
- 재정렬을 LIS로 접어 `moved`로 보고

제외(다음 plan):
- 컴포넌트/파일 귀속("어느 파일에서 회귀") — data-vg 컴파일타임 주입은 별도 plan
- idiomorph식 id-set 상향 전파
- A층(절대 규칙)과 축2(픽셀 diff)는 이번에 손대지 않는다

## 배경: 현재 MVP와 그 약점

현재 `diff.mjs`는 posKey(구조 경로) 1차 + 자기 텍스트 이동 2차로 매칭한다. 약점 둘:

1. **posKey 시프트**: 형제가 하나 삽입/삭제되면 뒤 형제의 번호가 전부 밀려, 무관한 요소끼리
   비교하고 그 델타를 엉뚱한 요소에 귀속한다.
2. **강제 매칭**: 매칭 불확실을 격리하지 않고 무조건 짝지어, 오매칭이 속성 델타 폭탄으로
   출력된다. 실패보다 이 자신만만한 오귀속이 더 위험하다.

## 설계

### 1. 레코드 스키마 분리

측정하려는 값(color, gap 등)이 매칭 신원에 섞이면 순환이 생긴다. 정당한 스타일 변경이
매칭을 깨고, 매칭이 깨지면 그 변경이 add/remove로 오보된다. 그래서 **측정 대상은 절대
매칭 키에 넣지 않는다.**

```
{
  identity: { tag, role, contractKey?, shapeHash },   // 매칭에만 사용
  metrics:  { gapTop, widthRatio, color, backgroundColor,
              fontSize, fontWeight, position },        // 델타 계산에만 사용
  content:  { ownText, textLen, lineCount }            // 준신원(하위 티어 매칭) + 델타
}
```

- `contractKey`: `data-testid` 또는 `role` + 접근성 이름. 프레임워크 무관한 의미적 신원.
- `lineCount = round(clientHeight / lineHeight)`: 재줄바꿈을 높이·gap 델타 여러 개가 아니라
  신호 하나로 접기 위한 파생값.

### 2. 상향식 해시 2종 (gate.mjs 추출 단계)

노드마다 자식 해시를 합성해 상향식으로 계산한다.

```
exactHash(node) = H(tag, 정규화(identity+metrics+content), [child.exactHash ...])
shapeHash(node) = H(tag, role, [child.shapeHash ...])   // 텍스트·측정값 제외
```

- `exactHash`(머클): before/after에서 같으면 서브트리 전체가 동일 → 매칭·재귀·델타를 전부
  생략(프루닝). 국소 변경이 대부분인 에이전트 루프에서 속도의 대부분이 여기서 나온다.
- `shapeHash`: 텍스트가 바뀌어도 흔들리지 않는 구조 신원. "텍스트 한 줄 변경이 조상 해시까지
  오염"하던 문제의 해법은 해시를 버리는 게 아니라 **두 등급으로 분리**하는 것이다.
  exactHash 불일치는 unmatched가 아니라 "더 내려가 봐라"의 뜻이다.

해시는 시드 고정 FNV-1a. 키 정렬된 canonical 직렬화 위에서만 계산한다.

### 3. 매칭 파이프라인 (부모 쌍마다, 결정적 순서)

React/Vue의 두 가정을 차용: 레벨을 건너 매칭하지 않는다, 태그가 다르면 다른 요소다.
그러면 문제가 "매칭된 부모 밑 형제 리스트끼리의 시퀀스 diff"로 분해되고, 형제 diff는
텍스트 diff와 같은 문제라 검증된 알고리즘을 쓸 수 있다.

```
matchChildren(B[], A[]):
  1. 양끝 트리밍     앞에서 exactHash 같은 쌍 pop, 뒤에서도 pop (Vue3 투 포인터)
  2. 계약키 매칭     contractKey가 양쪽에 정확히 1개일 때만 수락 (중복은 즉시 강등)
  3. 앵커 분할정복   shapeHash가 리스트 양쪽에서 유일한 쌍을 앵커로 확정,
                     앵커 사이 구간을 재귀 (git patience diff와 동형)
  4. 시퀀스 diff     잔여 구간 shapeHash 시퀀스에 LCS/Myers → 순서 보존 짝짓기
  5. 위치 폴백       같은 tag끼리 순서대로, 단 수락 게이트 통과 시에만
  6. added / removed 남은 것
  매칭된 각 쌍에 matchChildren 재귀
```

**1번이 실전 핵심.** posKey의 최악 케이스(형제 하나 삽입)가 key 없이도 양끝 트리밍만으로
정확히 풀린다. 삽입 지점 앞은 prefix, 뒤는 suffix로 맞물리고 중간에 삽입된 것만 남는다.
뒤 번호가 밀리는 현상 자체가 소멸한다.

복잡도: 해싱·트리밍 O(n), 앵커 O(k log k)(k=변경 구간). 라우트당 수천 노드면 diff는 수~수십 ms.
병목은 Playwright 렌더이므로 영리함보다 결정성에 예산을 쓴다.

### 4. 수락 게이트 + 마진 → ambiguous

강제 매칭을 구조적으로 금지한다.

```
score(b, a) = w1·[tag 일치, 필수] + w2·sim(shapeHash 근방) + w3·sim(text) + w4·근접도(index)
수락: score >= θ  AND  (1등 score - 2등 score) >= δ
```

마진 δ가 결정성의 핵심이다. 1등과 2등이 근소하면 입력의 미세한 흔들림으로 매칭이 뒤집힌다.
근소하면 매칭하지 말고 `ambiguous`로 격리한다. 모호함 자체는 결정적으로 재현되므로 게이트
출력으로 안전하다. θ, δ, w는 코드 상단 상수로 두고 합성 픽스처로 보정한다.

**사후 취소**: 위치 폴백(티어 5)으로 매칭됐는데 델타가 크면(태그 외 속성 대부분 상이) 매칭을
취소하고 add+remove로 강등한다. 낮은 신뢰 매칭 + 큰 델타 = 거의 확실한 오귀속.

### 5. 출력 5분류

`unchanged / changed(델타 목록) / moved / added+removed / ambiguous`.

- 매칭 실패는 속성 델타가 아니라 add+remove 쌍으로 보고한다.
- 재정렬은 LIS로 접는다: 신원 매칭 후 after 인덱스 시퀀스의 LIS에 든 것은 제자리,
  나머지만 `moved`(Vue3/Inferno 차용). 리스트 재정렬이 gapTop 델타 여러 개가 아니라
  "moved N"으로 나온다.
- 삽입 형제 다음 요소의 gapTop 델타에는 `adjacentTo` 주석만 달고 억제하지 않는다.
  진짜 회귀일 수 있으니 귀속만 시키고 판단은 의도 스코프 필터에 맡긴다.

### 6. 결정성

**추출 정규화 (gate.mjs)**
- `deviceScaleFactor: 1`로 고정(현재 2). 서브픽셀 분수값 축소.
- 색: `getComputedStyle` 직렬화가 브라우저·버전별로 다르므로 rgba 4-튜플로 파싱해 저장.
- 애니메이션·트랜지션·캐럿 kill CSS 주입 + `reducedMotion` 에뮬레이션.
- `document.fonts.ready` 대기(폰트 로딩 전/후가 섞이면 widthRatio·줄바꿈이 흔들림).
- `page.clock`으로 시계 고정(상대시간 표시가 있으면). 클라이언트 `Date.now`/`Math.random` 확인.
- `img` complete 대기 또는 픽스처에 width/height 명시.
- 스크롤 최상단 리셋(스크롤바 유무가 컨테이너 폭을 바꿈).
- CSS-in-JS 클래스명은 신원·비교에 절대 쓰지 않는다(computed style만). DWF는 Tailwind라
  안정적이지만 규약으로 못박는다.

**비교 허용오차**: 저장은 정밀하게, 판정은 무디게. 양자화 후 비교는 경계 플래핑(12.49 vs 12.51)
을 만드므로 금지. 원값 저장 + 비교 시 ε(예: 1px, 폭은 높이보다 타이트) 허용오차로 판정.

**수렴 루프 (gate.mjs)**: 비결정성을 "가끔 다른 판정"이 아니라 "안정 스냅샷 또는 명시적
타임아웃"으로 이진화한다.

```
repeat 최대 N회:
  s1 = extract(); await rAF x2; s2 = extract()
  if hash(s1) == hash(s2): return s1
timeout → 게이트 에러(회귀 아님). 판정 불가와 회귀를 절대 섞지 않는다.
```

## 구현 단계 (각 단계마다 검증)

- **Phase 0 (완료)**: fiber 커밋 제거, MVP baseline 복귀. `grep fiber` 0.
- **Phase 1**: gate.mjs 레코드 스키마 분리 + exactHash/shapeHash 상향식 계산 + 추출 정규화
  (dsf 1, rgba, 애니메이션 kill, fonts.ready). 검증: 무변경 재캡처 시 두 스냅샷 exactHash 동일.
- **Phase 2**: diff.mjs 매처 재작성 — 양끝 트리밍 + 앵커 분할정복 + 시퀀스 diff. 위치 폴백은
  임시로 무조건 허용. 검증: 합성 삽입/삭제 시나리오에서 오귀속 0.
- **Phase 3**: 수락 게이트/마진 + ambiguous 5분류 + 사후 취소. 검증: 모호 시나리오가
  ambiguous로, 낮은신뢰+큰델타가 add+remove로.
- **Phase 4**: 수렴 루프 + 비교 허용오차 ε. 검증: 실 하네스 무변경 diff가 네 환경 모두 0,
  반복 실행 결정적.
- **Phase 5**: moved LIS 압축 + adjacentTo 주석. 검증: 재정렬 시나리오가 moved N.

## 테스트 계획

**합성 픽스처 매트릭스** (구성한 before/after JSON, 브라우저 불필요, 빠른 회귀 스위트):

| 시나리오 | 기대 |
|---|---|
| 형제 앞 삽입 + 특정 요소 스타일 변경 | added 1, 스타일 변경은 정확한 요소에 귀속, 오귀속 0 |
| 형제 삭제 | removed 1, 나머지 unchanged |
| 재정렬 | moved N (LIS), 델타 폭탄 없음 |
| 텍스트 한 줄 변경 | changed(text/lineCount), 조상 매칭 유지 |
| 진짜 스타일 회귀(높이/색) | changed(metrics) 정확 귀속 |
| 동일 형제 2개 중 하나만 변경(모호) | ambiguous |
| 무변경 재캡처 | changed 0 (결정성) |

**실 하네스 검증**: mentionable/commentInput/replyInput 무변경 결정성(네 환경 0) + 의도적
변경 1건의 정확 귀속. 가능하면 keyed 레이아웃 리스트가 있는 라우트를 하네스에 하나 추가해
삽입·재정렬 시나리오를 실 DOM에서 재현.

## 리스크와 확인 필요

- `page.clock`: DWF 하네스 컴포넌트에 상대시간("3분 전") 표시가 있는지 확인. 없으면 생략.
- shapeHash 충돌: 동일 형태 형제가 다수면 앵커가 안 잡힘 → 시퀀스 diff + 위치 폴백 +
  ambiguous로 흡수됨(설계상 안전, 오귀속으로 새지 않음).
- 위치 폴백 임계(θ, δ) 보정은 합성 픽스처로 시작하되 실 하네스 값과 어긋나면 재보정.
- 글(tech-growth HTML)의 기존 "React 재조정 1차 매처" 섹션은 이 구현·검증 후에 프레임워크
  중립 서사로 교체한다(fiber는 소거 대상으로 재배치).

## 산출물

- `visual-gate/gate.mjs`, `visual-gate/diff.mjs` 재작성
- `visual-gate/__fixtures__/` 합성 시나리오 + `visual-gate/matcher.test.mjs`(노드 러너)
- README B층 설명 갱신
- 검증 로그를 `visual-gate/RESULTS.md`에 추가
