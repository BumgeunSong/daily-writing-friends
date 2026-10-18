import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const JUST_THREE_QUESTIONS_URL = `${SUPABASE_URL}/rest/v1/just_three_questions`;
const POSTS_URL = `${SUPABASE_URL}/rest/v1/posts`;

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
