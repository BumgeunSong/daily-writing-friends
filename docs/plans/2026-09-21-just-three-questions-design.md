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

세션 상태(로컬, 서버/라우터 state 불필요). **불변식: `remainingPool`은 아직 뽑히지 않은 질문만 담고, `currentQuestion`은 이미 풀에서 제거된 상태로 별도 보관한다** (리뷰에서 지적된 애매함 해소):

```ts
interface QuestionSession {
  remainingPool: string[];   // currentQuestion은 포함하지 않음
  currentQuestion: string;
  answers: string[];
}
```

풀에서 뽑힌 질문은 스킵/답변 여부와 무관하게 `remainingPool`에서 제거되어 같은 세션에서 재등장하지 않는다. 풀 크기를 20개 이상으로 잡아 "다음" 연타로 소진되기 어렵게 하되, **`remainingPool.length === 0`이 되면 스킵 버튼을 비활성화**한다 (currentQuestion이 이미 풀 밖에 있으므로 이때 스킵하면 다음 질문을 뽑을 수 없음 — off-by-one 수정).

## 3. 컴포넌트/파일 구조

```
post/
  data/
    justThreeQuestions.ts
  components/
    PostJustThreeQuestionsPage.tsx    # route: create/:boardId/just-three-questions
    PostJustThreeQuestionAnswerInput.tsx
  hooks/
    useJustThreeQuestionsSession.ts
  utils/
    justThreeQuestionsContentUtils.ts
```

컴포넌트 파일명은 `post/components/` 기존 컨벤션(`Post*`/`Editor*` 프리픽스)에 맞춰 `Post` 프리픽스를 붙인다 (기존 계획의 `JustThreeQuestionsPage.tsx`에서 수정).

- `WritingActionButton.tsx`의 `actions` 배열에 `{ to: /create/:boardId/just-three-questions, icon: ListChecks, label: "3줄쓰기" }` 추가.
- `router.tsx`의 `privateRoutesWithoutNav`에 lazy route 추가 (Component-only 등록, `create/:boardId` 라우트처럼 별도 action 없이 — `PostFreewritingPage.tsx`와 동일 패턴, `router.tsx:282-289` 참고).
- `useJustThreeQuestionsSession`: 마운트 시 첫 질문 추출, `skip()`/`recordAnswer()`로 세션 전진, 3개 완료 시 `isComplete: true`. 제출(네트워크 호출)은 페이지 컴포넌트가 담당 — `PostFreewritingPage.tsx:59-98`과 동일한 훅/페이지 경계.
- content 포맷: 답변에서 `<`, `>` 문자를 제거한 뒤 `Q. {question} > {answer}` 를 개행 두 번으로 join. (`<`, `>` 를 남기면 `contentUtils.ts`의 `isHtmlContent` 정규식이 오작동해 줄바꿈 변환이 스킵될 수 있음 — DOMPurify가 있어 XSS는 아니지만 레이아웃이 깨짐. 답변은 30자 제한 텍스트라 이 문자를 지워도 의미 손실이 거의 없음.)
- title은 `userNickname ? `${userNickname}님의 3줄 쓰기` : '3줄 쓰기'` (닉네임 미해결 시 fallback, `PostFreewritingPage.tsx:40` 패턴).

## 4. 답변 입력 UI

TipTap 기반 `PostEditor`는 재사용하지 않는다 — "30자 제한 · 서식 없음"이 컨셉이라 plain `<textarea>` 가 더 가볍다.

**글자 수 유틸은 새로 만들지 않고 기존 `post/utils/topicInputUtils.ts`를 재사용한다** (freewriting 주제 입력이 이미 동일한 "공백 제외 N자 제한" 요구사항을 갖고 있고, `[...text]`로 서로게이트 페어(이모지)를 1글자로 정확히 센다 — 새로 작성한 `countNonWhitespace`는 이 부분에서 틀림):

```ts
import {
  countNonWhitespaceCharacters,
  isWithinCharacterLimit,
  truncateToNonWhitespaceLimit,
} from '@/post/utils/topicInputUtils';

export const MAX_ANSWER_LENGTH = 30;
```

**초과 입력은 "차단"이 아니라 "잘라내기"로 처리한다.** state 업데이트 자체를 막으면(원래 계획) 한글 조합 중(IME composition) 입력이 데스크톱 브라우저에서 씹히거나 중복되는 문제가 있다 — `PostFreewritingIntro.tsx:34-43`이 이미 이 문제를 `truncateToNonWhitespaceLimit`로 우회하고 있으므로 동일 패턴을 따른다:

```tsx
const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
  const truncated = isWithinCharacterLimit(e.target.value, MAX_ANSWER_LENGTH)
    ? e.target.value
    : truncateToNonWhitespaceLimit(e.target.value, MAX_ANSWER_LENGTH);
  setAnswer(truncated);
};

const canSubmit = countNonWhitespaceCharacters(answer) > 0;
```

**`<textarea>`에 `maxLength` 속성은 넣지 않는다** — `maxLength`는 공백 포함 UTF-16 단위로 세므로, 공백이 있는 정상적인 30자(공백 제외) 답변을 브라우저가 먼저 잘라버려 위 로직과 기준이 어긋난다. 글자 수 제한은 전적으로 `topicInputUtils`가 담당한다.

- 빈 답변(공백만 포함) 제출 불가.
- 공백은 글자 수에 포함하지 않는다.
- "n/30" 카운터를 `tabular-nums`로 표시해 레이아웃 흔들림 방지. 초과분이 조용히 잘려나가는 것을 스크린리더 사용자도 알 수 있도록 카운터 컨테이너에 `aria-live="polite"` 부여.
- textarea에 `aria-labelledby`(현재 질문 heading의 id)를 연결해 스크린리더가 "어떤 질문에 대한 입력창인지" 읽도록 한다.
- 질문이 전환돼도(스킵/다음) textarea에 포커스를 유지해 모바일 키보드가 매번 닫혔다 열리지 않게 한다.
- 하단 고정 버튼 영역은 기존 `useKeyboardInset` 훅으로 모바일 키보드 인셋을 반영한다 (`PostFreewritingIntro.tsx:131-134`의 sticky-bottom 패턴 참고).
- 디자인 시스템 토큰 사용: `reading-focus`, `bg-input`, `border-border`, `Button` 컴포넌트 variant(`default`/`ghost`), 모바일 `px-3 md:px-4`.

## 5. 제출 완료 & 네비게이션

- 3번째 질문에서 버튼 라벨이 "완료"로 전환.
- **중복 제출 방지**: `isSubmitting` state는 다음 렌더에야 반영되므로 같은 틱 안의 연타/Enter 중복 입력을 못 막는다(`createPost`는 매번 `crypto.randomUUID()`로 새 글을 만들어 idempotency key가 없음). `useRef` 래치를 핸들러 진입 시점에 동기적으로 체크·설정해 이중 제출을 막는다:
  ```tsx
  const isSubmittingRef = useRef(false);
  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try { /* ... */ } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  ```
- 제출 시 `createPost({ boardId, title, content, authorId, authorName, visibility: PostVisibility.PUBLIC })` 호출.
- **캐시 무효화 + 스트릭 갱신**: freewriting은 PRIVATE라 생략해도 안전했지만, 3줄쓰기는 PUBLIC이라 생략하면 게시판 목록에 새 글이 안 보이고 스트릭도 안 올라간다. `useCreatePostAction.ts:98-99`와 동일하게 성공 직후 호출한다:
  ```tsx
  invalidatePostCaches(boardId, currentUser.uid);
  optimisticallyUpdatePostingStreak(currentUser.uid);
  ```
- **분석 이벤트**: `AnalyticsEvent`에 `START_JUST_THREE_QUESTIONS` / `FINISH_JUST_THREE_QUESTIONS`를 추가하고(`analyticsUtils.ts` 기존 `START_FREE_WRITING`/`FINISH_FREE_WRITING` 패턴), 첫 질문 마운트 시/제출 성공 시 각각 전송한다. 완료율·질문별 스킵률 측정에 필요.
- 성공 시 `navigate(/board/:boardId/post/:postId, { replace: true })` — 뒤로가기 시 3줄쓰기 화면이 아니라 게시판으로 이동.
- 제출 중 `isSubmitting`으로 완료 버튼 비활성화 + 로딩 표시.
- 실패 시 답변은 로컬 state에 유지되어 재시도 가능. router action이 아니라 `createPost`를 직접 호출하므로 `useActionData`를 쓸 수 없고, `PostFreewritingPage.tsx:92-94`처럼 `try/catch` + `mapCreatePostErrorMessage(error)` + `toast.error`로 에러를 노출한다.

## 6. 테스트 전략

**단위 테스트** (pure util만, `justThreeQuestionsContentUtils.test.ts` — 글자 수 제한 자체는 `topicInputUtils.test.ts`에 이미 커버되어 있으므로 재검증하지 않음):
- `formatJustThreeQuestionsContent`: Q&A 3쌍 → content 포맷, 답변에 `<`/`>` 포함 시 제거되는지

**통합 테스트** (`PostJustThreeQuestionsPage.integration.test.tsx`, MSW로 Supabase/analytics 모킹) — 훅 로직은 사용자 행동을 통해 간접 검증:
- 질문 표시 → 답변 입력 → "다음" 클릭 시 다음 질문 및 진행 상태 갱신
- 스킵한 질문이 같은 세션에서 재등장하지 않음, 풀이 1개 남았을 때 스킵 버튼 비활성화
- 30자(공백 제외) 초과 입력 시 잘려나가고 카운터가 갱신됨, 빈 답변 시 제출 버튼 비활성화
- "완료" 연타/중복 클릭 시 `createPost`가 정확히 1번만 호출됨
- 3개 답변 완료 → `createPost`가 올바른 content/title(닉네임 fallback 포함)/visibility(PUBLIC)로 호출되고, 캐시 무효화·스트릭 갱신·완료 분석 이벤트가 발생, post 상세로 이동
- 제출 실패 시 에러 토스트 노출 + 답변 유지(재시도 가능)

훅 단위 테스트는 만들지 않는다(사용자 시나리오 테스트와 중복되고 구현 디테일에 결합되기 쉬움).

## Out of scope (v1)

- A/B 선택형 UI 컴포넌트 (질문 문구로만 표현, 별도 데이터 모델 없음)
- 제출 전 미리보기/수정 화면
- intro/튜토리얼 화면
- 질문 풀의 DB/CMS 관리
- E2E 테스트
