import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const JUST_THREE_QUESTIONS_URL = `${SUPABASE_URL}/rest/v1/just_three_questions`;
const POSTS_URL = `${SUPABASE_URL}/rest/v1/posts`;
const PERSONALIZED_QUESTIONS_URL = `${SUPABASE_URL}/rest/v1/personalized_questions`;

export interface JustThreeQuestionsHandlerOptions {
  /** Question text served as the active pool, in `created_at` order. */
  questions: string[];
}

/** MSW handler for `GET /rest/v1/just_three_questions?select=question&is_active=eq.true&order=created_at.asc`. */
export function justThreeQuestionsHandler({ questions }: JustThreeQuestionsHandlerOptions) {
  return http.get(JUST_THREE_QUESTIONS_URL, () =>
    HttpResponse.json(questions.map((question) => ({ question }))),
  );
}

/** Convenience: always returns 500. Used to drive the error-state branch. */
export function justThreeQuestionsErrorHandler() {
  return http.get(JUST_THREE_QUESTIONS_URL, () =>
    HttpResponse.json({ message: 'boom' }, { status: 500 }),
  );
}

/** Convenience: never resolves. Used to drive the loading-state branch. */
export function justThreeQuestionsPendingHandler() {
  return http.get(
    JUST_THREE_QUESTIONS_URL,
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- an executor that never settles is the point
    () => new Promise(() => {}),
  );
}

export interface PersonalizedQuestionFixture {
  id: string;
  question: string;
  answeredAt?: string | null;
}

export interface PersonalizedQuestionsHandlerOptions {
  questions: PersonalizedQuestionFixture[];
  onRequest?: (url: URL) => void;
}

/**
 * MSW handler for the personalized-question read: `GET /rest/v1/posts` with an embedded
 * `personalized_questions(...)`. Each fixture becomes one post carrying its question.
 */
export function personalizedQuestionsHandler({ questions, onRequest }: PersonalizedQuestionsHandlerOptions) {
  return http.get(POSTS_URL, ({ request }) => {
    onRequest?.(new URL(request.url));
    return HttpResponse.json(
      questions.map(({ id, question, answeredAt = null }, index) => ({
        id: `post-${index}`,
        personalized_questions: { id, question, answered_at: answeredAt },
      })),
    );
  });
}

/** Convenience: the personalized read always returns 500. */
export function personalizedQuestionsErrorHandler() {
  return http.get(POSTS_URL, () => HttpResponse.json({ message: 'boom' }, { status: 500 }));
}

export interface AnswerPersonalizedQuestionsHandlerOptions {
  onUpdate?: (url: URL, body: unknown) => void;
  fail?: boolean;
  /** RLS가 행을 걸러 내면 오류 없이 0건이 갱신된다. true면 그 상황을 흉내 낸다. */
  matchesNoRows?: boolean;
  /** 이 Promise가 풀릴 때까지 응답을 미룬다. 응답 전에 페이지를 떠나는 상황을 만든다. */
  respondAfter?: Promise<unknown>;
}

/** MSW handler for `PATCH /rest/v1/personalized_questions` (marking questions answered). */
export function answerPersonalizedQuestionsHandler({
  onUpdate,
  fail = false,
  matchesNoRows = false,
  respondAfter,
}: AnswerPersonalizedQuestionsHandlerOptions = {}) {
  return http.patch(PERSONALIZED_QUESTIONS_URL, async ({ request }) => {
    onUpdate?.(new URL(request.url), await request.json());
    await respondAfter;
    if (fail) return HttpResponse.json({ message: 'boom' }, { status: 500 });
    const wantsRows = (request.headers.get('Prefer') ?? '').includes('return=representation');
    if (!wantsRows) return new HttpResponse(null, { status: 204 });
    const requestedIds = (new URL(request.url).searchParams.get('id') ?? '').replace(/^in\.\(|\)$/g, '').split(',');
    return HttpResponse.json(matchesNoRows ? [] : requestedIds.map((id) => ({ id })));
  });
}
