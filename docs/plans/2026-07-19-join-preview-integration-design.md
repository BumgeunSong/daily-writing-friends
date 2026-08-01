# /join × /preview 통합 설계

작성일: 2026-07-19
브랜치: antique-monitor

## 배경과 목표

`/preview`는 지금 `/join` 히어로 아래 "매글프 미리보기" 버튼 뒤에 1-depth로 숨어 있다. 더 많은 사람이 커뮤니티의 실제 분위기를 보게 하려고, 프리뷰 콘텐츠를 `/join` 본문에 자연스럽게 녹인다.

제약: 프리뷰 글이 ~20개라 전부 인라인으로 펼치면 섹션이 너무 길어져 아래 섹션과 CTA가 안 보인다. 그래서 일부만 보여주고 나머지는 `/preview`로 넘긴다.

## 분위기와 톤

- witty & warm community, 담백한 말투
- people-first: 지금 살아있는 커뮤니티라는 인상
- 기대 액션: "지금 신청하기". 목표 감정은 "이 정도면 나도 써볼 수 있겠다 / 무료인데 이렇게 따뜻하다고?"

## 목표 반응 → 콘텐츠 매핑

세 goal 카드가 각각 살아있는 증거를 하나씩 갖는다.

| goal 카드 | 살아있는 증거 | 타겟 반응 |
|---|---|---|
| 매일 쓰기 | GitHub 스타일 잔디 (D) | "사람들이 진짜 매일 쓰는구나" |
| 같이 쓰기 | 주고받는 댓글 스레드 (B) | "무료인데 이런 따뜻한 대화가?" |
| 생각의 깊이 | 기존 카피 | (유지) |
| (독립 섹션) | 카드 peek (A) | "제목이 재밌네 / 이 정도 분량이면 되네" |

---

## A. 카드 peek 섹션 (신규)

**위치:** `ReviewCarousel`("'매생이'들의 후기") 다음, `CountdownSection` 앞. 기존 `SectionWrapper` + `text-xl font-bold md:text-2xl` 헤더 리듬을 따른다.

**헤더 행:** 좌측 제목 `이런 글들이 올라와요`, 우측 `전체 보기 →` ghost 링크 → `/preview`. `Row justify-between`.

**캐러셀:** 가로 scroll-snap 스트립. 페이지네이션 점은 쓰지 않는다. 다음 카드가 살짝 삐져나오게(peek) 두어 "넘길 수 있다"를 시각적으로 전달한다. 높이는 카드 1장 높이로 고정 → 글 수와 무관하게 아래 섹션이 밀리지 않는다.

**카드 1장 (고정폭 약 264px):**

```
┌────────────────────┐
│ 🙂 울릉도오징어 · 8일차 │   ComposedAvatar + 이름 + 일차 badge
│ 매글프에게 치덕대는 글  │   제목 (font-semibold, line-clamp-2) — 주인공
│ 본문 두 줄 발췌가 여기…  │   contentPreview (line-clamp-2, muted)
│ 💬 4                 │   countOfComments
└────────────────────┘
```

카드 전체 탭 → `/preview/post/:id`.

**마지막(9번째) 더보기 카드:** dashed border + accent. 문구 `글 N개 더 있어요 →` (N은 `PREVIEW_POSTS.length` 기반 계산, 하드코딩 금지). 탭 → `/preview`. 스와이프 흐름 그대로 전체 페이지로 진입.

**큐레이션:** ~20개 중 8개를 editorial하게 고정한다. 프리뷰 데이터에 순서를 담은 `PEEK_POST_IDS: string[]`를 두고, "재밌는 제목 + 부담 없는 분량" 기준으로 손으로 고른다. 알고리즘 아님.

**탭 동작:** 모두 `/preview`로 이동한다. `/preview`는 "더 깊이 보기" 목적지로 유지한다.

---

## B. '같이 쓰기' 카드 — 진짜 댓글 스레드

현재 이 카드 footer는 `MockCommentRow`(가짜)다. 프리뷰에서 뽑은 실제 주고받는 스레드 1개로 교체한다. 본문 카피는 그대로 두고, 그 아래 살아있는 증거로 스레드를 붙인다.

```
💬 초코송이   저도 완전 공감해요
   ↳ 글쓴이    헤헤 공감해주셔서 다행이에요
   ↳ 밤양갱    이 맛에 매글프 하죠 ㅋㅋ
```

- 답글은 좌측 border(`border-l`) + 들여쓰기로 계층 표현
- 아바타 + 이름 + body 한 줄
- `글쓴이` 뱃지로 원글 작성자 강조 → "댓글 달면 답장이 온다"는 따뜻함 전달
- 데이터: 댓글 → 원글작성자 답글 → 제3자 답글 형태가 나오는 스레드 하나를 `PEEK_THREAD = { postId, commentId }`로 참조

---

## C. 상단 PreviewEntryButton 제거

히어로 바로 아래 "매글프 미리보기" 버튼은 이제 peek + `전체 보기 →`와 같은 목적지로 가는 중복 문이다. 제거한다. 상단이 깔끔해지고, 진짜 콘텐츠(peek)가 스크롤 흐름 속에서 자연스럽게 등장한다. 원래 걱정한 "1-depth 숨김"은 peek이 본문에 노출되며 해소된다.

---

## D. '매일 쓰기' 잔디 복구 (버그 수정)

### 검증된 근본 원인

초기 진단(동적 Tailwind 클래스 `grid-rows-${WEEKS_TO_DISPLAY}`)은 오진이다. `grid-rows-4`는 `UserPostingStatsCardSkeleton.tsx:17`에 정적으로 존재해 Tailwind v3가 번들에 emit한다. 런타임 보간 클래스가 정상 해석되므로 레이아웃은 작동한다.

진짜 원인: `timeRange.ts`의 `getTimeRange()`가 그리드 창을 오늘 기준 최근 4주로 계산한다(`getKoreanToday()`). `mockUserStats`의 contribution 날짜는 2024-02-21 ~ 03-14이라, `filterContributionsInTimeRange`가 창 밖 데이터를 전부 걸러낸다. 결과적으로 살아남는 셀이 0개가 되어 4×5 잔디가 전부 회색으로 렌더된다. 렌더는 되지만 텅 빈 잔디라 깨진 것처럼 보였다.

증거 흐름: `useContributionGridData(mock.contributions)` → `getTimeRange()`(today-anchored) → `filter([2024...], [2026-06-29 ~ 07-19])` → `[]` → 전부 null 셀.

### 수정 (root cause)

하드코딩된 2024 배열을 오늘 기준 생성 데이터로 교체한다.

- `generateMockContributions(today = new Date())` → 최근 4 ISO주의 평일(월–금) contribution 생성. 미래 날짜 없음(창이 `<= today` 필터)
- 믿음직한 패턴: `contentLength`를 0/80/150/300/500처럼 섞어 색 농도 2~4단계가 보이게 하고, 의도적으로 1~2일 빈칸을 둔다(완벽하면 가짜 티)
- 오늘이 지나도 항상 최신 4주가 채워져 유지보수 불필요

`mockUserStats`는 `shared/components/mockUserStats.ts`에 있고 소비처는 `GoalSection.tsx` 하나뿐이라 부작용 없이 교체 가능하다.

### 방어적 하드닝 (포함)

동적 클래스 `grid-rows-${WEEKS_TO_DISPLAY}`를 정적 `grid-rows-4`로 바꾼다. 지금은 안전하지만 `WEEKS_TO_DISPLAY`가 바뀌면 조용히 깨지는 footgun을 제거한다.

---

## 높이 예산 (refactoring-ui)

- A peek: 약 +260px (글 수와 무관하게 고정)
- B 스레드: MockCommentRow 대비 약 +80px
- C 버튼 제거: 약 −48px
- D 잔디: 높이 변화 없음 (빈 → 채움)

순증가는 작고, 20개를 인라인으로 펼치지 않으므로 아래 섹션이 가려지는 문제는 없다.

## 구현 touchpoint

- `apps/web/src/login/components/JoinIntroPage.tsx` — A 섹션 삽입, C 버튼 제거
- 신규 `PreviewPeekSection.tsx` (가칭) — A 캐러셀 + 더보기 카드
- `apps/web/src/login/components/GoalSection.tsx` — B 스레드로 footer 교체
- `apps/web/src/preview/data/` — `PEEK_POST_IDS`, `PEEK_THREAD` 큐레이션 상수
- `apps/web/src/shared/components/mockUserStats.ts` — D 오늘 기준 생성으로 교체
- `apps/web/src/stats/components/ContributionGraph.tsx:70` — 정적 `grid-rows-4`

## 검증 계획

- 타입체크 + 기존 grid 테스트 (`contributionGridUtils.test.ts` 등) 통과
- 브라우저 실측(verify-browser): `/join`에서 잔디가 채워져 렌더, peek 스와이프 후 더보기 → `/preview` 이동, 같이 쓰기 스레드 노출, 상단 버튼 부재, 다크모드 색상
