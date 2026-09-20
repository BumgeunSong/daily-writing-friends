# 3줄쓰기 (Just Three Questions) 설계

## 배경

daily-writing-friends는 글쓰기 최소 분량이 없지만, 사람들은 여전히 매일 글쓰기를 부담스러워한다. 아프거나, 야근했거나, 기분이 바닥인 날 밤 11시에도 실패하기 힘든 아주 작은 mini habit을 제공해 습관 변화의 시작점을 만드는 것이 목표다.

사용자는 30자 이내로 짧게 답할 수 있는 질문 3개에 순서대로 답하고, 마음에 안 드는 질문은 "다음"으로 건너뛸 수 있다. 3개를 다 채우면 자동으로 post가 생성된다.

## 1. 사용자 플로우

```
WritingActionButton 메뉴에 "3줄쓰기" 항목 추가
  → /create/:boardId/just-three-questions 로 이동 (intro 화면 없음)
  → 질문 풀에서 랜덤 1개 뽑아 화면에 표시
    - 답변 입력 (공백 제외 30자 제한, 실시간 "n/30" 카운터)
    - "다음 질문" 버튼(스킵): 같은 질문 다시 안 나오게 풀에서 제외, 새 질문 랜덤 추출
    - 제출 버튼: 답 저장하고 다음 질문으로 (진행 상태 1/3 → 2/3 → 3/3)
  → 3번째 질문 제출 시 자동으로 createPost 호출, PUBLIC 게시
  → 완료 화면 없이 생성된 post 상세 페이지로 이동 (replace: true)
```

한 화면에 질문 1개만 노출, 뒤로가기로 이전 질문/답변을 되돌아볼 수 없음 — 가볍게 훅 지나가는 경험을 유지한다.

## 2. 데이터 모델 & 질문 풀 소진 처리

질문 풀은 코드 상수 배열로 시작 (최소 20개 이상):

```ts
// apps/web/src/post/data/justThreeQuestions.ts
export const JUST_THREE_QUESTIONS: readonly string[] = [
  "오늘 속으로 가장 많이 한 말은?",
  "오늘 기분 좋았던 일을 5자로 적는다면?",
  "내일의 나에게 한마디?",
  "오늘을 되돌아봤을 때 기록해두고 싶은 3단어는?",
  "매일 4시간만 자도 개운한 것 vs 먹고 싶은 거 다 먹어도 살 안 찌는 것, 고른다면?",
  // ... 20개 이상
];
```

세션 상태(로컬, 서버/라우터 state 불필요):
```ts
interface QuestionSession {
  remainingPool: string[];
  currentQuestion: string;
  answers: string[];
}
```

풀에서 뽑힌 질문은 스킵/답변 여부와 무관하게 풀에서 제거되어 같은 세션에서 재등장하지 않는다. 풀 크기를 20개 이상으로 잡아 "다음" 연타로 소진되기 어렵게 하되, `remainingPool.length === 1`이 되면 스킵 버튼을 비활성화하는 안전장치를 둔다.

## 3. 컴포넌트/파일 구조

```
post/
  data/
    justThreeQuestions.ts
  components/
    JustThreeQuestionsPage.tsx        # route: create/:boardId/just-three-questions
    JustThreeQuestionAnswerInput.tsx
  hooks/
    useJustThreeQuestionsSession.ts
  utils/
    justThreeQuestionsContentUtils.ts
```

- `WritingActionButton.tsx`의 `actions` 배열에 `{ to: /create/:boardId/just-three-questions, icon: ListChecks, label: "3줄쓰기" }` 추가.
- `router.tsx`의 `privateRoutesWithoutNav`에 lazy route 추가.
- `useJustThreeQuestionsSession`: 마운트 시 첫 질문 추출, `skip()`/`recordAnswer()`로 세션 전진, 3개 완료 시 `isComplete: true`.
- content 포맷: `Q. {question} > {answer}` 를 개행 두 번으로 join. title은 `${nickname}님의 3줄 쓰기`.

## 4. 답변 입력 UI

TipTap 기반 `PostEditor`는 재사용하지 않는다 — "30자 제한 · 서식 없음"이 컨셉이라 plain `<textarea maxLength>` 가 더 가볍고 글자 수 제한도 자연스럽다.

```ts
export const MAX_ANSWER_LENGTH = 30;
export function countNonWhitespace(text: string): number {
  return text.replace(/\s/g, '').length;
}
export function canAcceptInput(nextValue: string): boolean {
  return countNonWhitespace(nextValue) <= MAX_ANSWER_LENGTH;
}
export function canSubmitAnswer(value: string): boolean {
  return countNonWhitespace(value) > 0;
}
```

- 빈 답변(공백만 포함) 제출 불가.
- 공백은 글자 수에 포함하지 않는다.
- 30자(공백 제외) 초과 입력은 state에 반영되지 않아 입력 자체가 막힌다.
- "n/30" 카운터를 `tabular-nums`로 표시해 레이아웃 흔들림 방지.
- 디자인 시스템 토큰 사용: `reading-focus`, `bg-input`, `border-border`, `Button` 컴포넌트 variant(`default`/`ghost`), 모바일 `px-3 md:px-4`.

## 5. 제출 완료 & 네비게이션

- 3번째 질문에서 버튼 라벨이 "완료"로 전환.
- 제출 시 `createPost({ boardId, title, content, authorId, authorName, visibility: PostVisibility.PUBLIC })` 호출.
- 성공 시 `navigate(/board/:boardId/post/:postId, { replace: true })` — 뒤로가기 시 3줄쓰기 화면이 아니라 게시판으로 이동.
- 제출 중 `isSubmitting`으로 완료 버튼 비활성화 + 로딩 표시.
- 실패 시 답변은 로컬 state에 유지되어 재시도 가능, 에러 노출은 기존 `useCreatePostAction` 에러 핸들링 패턴을 따른다.

## 6. 테스트 전략

**단위 테스트** (pure util만, `justThreeQuestionsContentUtils.test.ts`):
- `countNonWhitespace`: 공백/탭/줄바꿈 제외 카운트
- `canAcceptInput` / `canSubmitAnswer`: 경계값(정확히 30자, 31자, 공백만, 빈 문자열)
- `formatJustThreeQuestionsContent`: Q&A 3쌍 → content 포맷

**통합 테스트** (`JustThreeQuestionsPage.integration.test.tsx`, MSW로 Supabase 모킹) — 훅 로직은 사용자 행동을 통해 간접 검증:
- 질문 표시 → 답변 입력 → "다음" 클릭 시 다음 질문 및 진행 상태 갱신
- 스킵한 질문이 같은 세션에서 재등장하지 않음
- 3개 답변 완료 → `createPost`가 올바른 content/title/visibility(PUBLIC)로 호출, post 상세로 이동
- 30자 초과 입력 차단 + 카운터 표시, 빈 답변 시 제출 버튼 비활성화
- 제출 실패 시 에러 노출 + 답변 유지(재시도 가능)

훅 단위 테스트는 만들지 않는다(사용자 시나리오 테스트와 중복되고 구현 디테일에 결합되기 쉬움).

## Out of scope (v1)

- A/B 선택형 UI 컴포넌트 (질문 문구로만 표현, 별도 데이터 모델 없음)
- 제출 전 미리보기/수정 화면
- intro/튜토리얼 화면
- 질문 풀의 DB/CMS 관리
- E2E 테스트
