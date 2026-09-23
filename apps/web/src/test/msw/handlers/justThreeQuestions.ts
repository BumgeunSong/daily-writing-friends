import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const JUST_THREE_QUESTIONS_URL = `${SUPABASE_URL}/rest/v1/just_three_questions`;

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
