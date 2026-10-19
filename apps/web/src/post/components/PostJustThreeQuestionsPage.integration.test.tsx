import type { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostJustThreeQuestionsPage from './PostJustThreeQuestionsPage';
import { server } from '@/test/msw/server';
import { createPostErrorHandler, createPostHandler } from '@/test/msw/handlers/posts';
import {
  answerPersonalizedQuestionsHandler,
  justThreeQuestionsErrorHandler,
  justThreeQuestionsHandler,
  justThreeQuestionsPendingHandler,
  personalizedQuestionsErrorHandler,
  personalizedQuestionsHandler,
} from '@/test/msw/handlers/justThreeQuestions';
import { createTestQueryClient, withProviders } from '@/test/utils/withProviders';

/**
 * Seam under test: the 3-question session loop (question → answer → next)
 * and the createPost round-trip on the 3rd answer. Randomness and
 * cache-invalidation side effects are stubbed so the test stays deterministic
 * and focused on this page's own contract, not on the question pool's
 * content or postCacheUtils' internals. The question pool fetch
 * (`GET /rest/v1/just_three_questions`) is mocked at the HTTP layer via MSW,
 * not the `useJustThreeQuestions` hook, so the test exercises the real
 * query/fetch/mapping path instead of coupling to the hook's implementation.
 */

const SIGNED_IN_USER = { uid: 'alice', email: 'alice@test.local', displayName: 'Alice', photoURL: null };
const PERSONALIZED_QUESTION_TEXT = '그날 산책길에서 어떤 기분이었어요?';
const TEST_QUESTIONS = ['질문1', '질문2', '질문3', '질문4', '질문5'];

const authState = vi.hoisted(() => ({
  user: { uid: 'alice', email: 'alice@test.local', displayName: 'Alice', photoURL: null } as {
    uid: string;
    email: string;
    displayName: string;
    photoURL: null;
  } | null,
}));

vi.mock('@/shared/hooks/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks/useAuth')>(
    '@/shared/hooks/useAuth',
  );
  return {
    ...actual,
    useAuth: () => ({ currentUser: authState.user, loading: false }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/user/hooks/useUserNickname', () => ({
  useUserNickname: () => ({ nickname: '앨리스', isLoading: false, error: null }),
}));

const invalidatePostCaches = vi.fn();
const optimisticallyUpdatePostingStreak = vi.fn();
vi.mock('@/post/utils/postCacheUtils', () => ({
  invalidatePostCaches: (...args: unknown[]) => invalidatePostCaches(...args),
  optimisticallyUpdatePostingStreak: (...args: unknown[]) => optimisticallyUpdatePostingStreak(...args),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() } }));

const captureException = vi.fn();
vi.mock('@sentry/react', async () => {
  const actual = await vi.importActual<typeof import('@sentry/react')>('@sentry/react');
  return { ...actual, captureException: (...args: unknown[]) => captureException(...args) };
});

const sendAnalyticsEvent = vi.fn();
vi.mock('@/shared/utils/analyticsUtils', async () => {
  const actual = await vi.importActual<typeof import('@/shared/utils/analyticsUtils')>(
    '@/shared/utils/analyticsUtils',
  );
  return {
    ...actual,
    sendAnalyticsEvent: (...args: unknown[]) => sendAnalyticsEvent(...args),
  };
});

function renderPage(queryClient?: QueryClient) {
  const { Wrapper } = withProviders({ queryClient });
  return render(
    <MemoryRouter initialEntries={['/create/board-1/just-three-questions']}>
      <Wrapper>
        <Routes>
          <Route path="/create/:boardId/just-three-questions" element={<PostJustThreeQuestionsPage />} />
          <Route path="/board/:boardId/post/:postId" element={<div>게시글 상세</div>} />
        </Routes>
      </Wrapper>
    </MemoryRouter>,
  );
}

async function answerAndAdvance(user: ReturnType<typeof userEvent.setup>, text: string) {
  const textarea = await screen.findByRole('textbox');
  await user.clear(textarea);
  await user.type(textarea, text);
  await user.click(screen.getByRole('button', { name: /제출|완료/ }));
}

describe('PostJustThreeQuestionsPage — 3줄쓰기 세션 흐름', () => {
  beforeEach(() => {
    // pickRandomQuestion always selects index 0 of the remaining pool, so the
    // question sequence is deterministic: 질문1 → 질문2 → 질문3 → 질문4 → 질문5.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    server.use(
      justThreeQuestionsHandler({ questions: TEST_QUESTIONS }),
      personalizedQuestionsHandler({ questions: [] }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    invalidatePostCaches.mockClear();
    optimisticallyUpdatePostingStreak.mockClear();
    sendAnalyticsEvent.mockClear();
  });

  it('shows a loading spinner while the question pool is being fetched', () => {
    server.use(justThreeQuestionsPendingHandler());
    renderPage();

    expect(screen.queryByText('질문1')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows an error state when the question pool fails to load', async () => {
    server.use(justThreeQuestionsErrorHandler());
    renderPage();

    expect(await screen.findByText(/질문을 불러오지 못했어요/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the first question and advances progress after an answer is submitted', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('질문1')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();

    await answerAndAdvance(user, '답변1');

    expect(screen.getByText('질문2')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('does not show a skipped question again and disables skip once too few questions remain to finish the session', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('질문1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음 질문' }));
    expect(screen.getByText('질문2')).toBeInTheDocument();
    expect(screen.queryByText('질문1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다음 질문' }));
    expect(screen.getByText('질문3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 질문' })).toBeDisabled();
  });

  it('truncates input beyond 30 non-whitespace characters and keeps the counter in sync', async () => {
    const user = userEvent.setup();
    renderPage();

    const textarea = await screen.findByRole('textbox');
    await user.type(textarea, 'a'.repeat(35));

    expect(textarea).toHaveValue('a'.repeat(30));
    expect(screen.getByText('30/30')).toBeInTheDocument();
  });

  it('disables submit while the answer is blank', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: '제출' })).toBeDisabled();
  });

  it('disables submit when the answer is only "<", ">" and whitespace, since formatting strips them to blank', async () => {
    const user = userEvent.setup();
    renderPage();

    const textarea = await screen.findByRole('textbox');
    await user.type(textarea, '<< >>');

    expect(screen.getByRole('button', { name: '제출' })).toBeDisabled();
  });

  it('submits createPost exactly once on rapid double-click of the final "완료" button', async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    server.use(createPostHandler({ onInsert }));
    renderPage();

    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '답변3');
    const completeButton = screen.getByRole('button', { name: '완료' });
    await Promise.all([user.click(completeButton), user.click(completeButton)]);

    await screen.findByText('게시글 상세');
    expect(onInsert).toHaveBeenCalledTimes(1);
  });

  it('completes the session with correct content/title/visibility and side effects, then navigates to the post', async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    server.use(createPostHandler({ onInsert }));
    renderPage();

    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');

    await screen.findByText('게시글 상세');

    expect(onInsert).toHaveBeenCalledTimes(1);
    const insertedBody = onInsert.mock.calls[0][0];
    expect(insertedBody.title).toBe('앨리스님의 3줄 쓰기');
    expect(insertedBody.visibility).toBe('public');
    expect(insertedBody.content).toBe(
      'Q. 질문1 > 답변1\n\nQ. 질문2 > 답변2\n\nQ. 질문3 > 답변3',
    );

    expect(invalidatePostCaches).toHaveBeenCalledWith('board-1', SIGNED_IN_USER.uid);
    expect(optimisticallyUpdatePostingStreak).toHaveBeenCalledWith(SIGNED_IN_USER.uid);
    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      'finish_just_three_questions',
      expect.objectContaining({ boardId: 'board-1' }),
    );
  });

  it('shows an error toast and keeps the last answer when createPost fails', async () => {
    const user = userEvent.setup();
    server.use(createPostErrorHandler());
    renderPage();

    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '답변3');
    await user.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(screen.queryByText('게시글 상세')).not.toBeInTheDocument();
    expect(screen.getByText('질문3')).toBeInTheDocument();
    expect(textarea).toHaveValue('답변3');
  });
});

describe('최근 글에서 파생된 개인화 질문이 있는 유저가 3줄쓰기를 시작할 때', () => {
  afterEach(() => {
    authState.user = SIGNED_IN_USER;
    vi.useRealTimers();
    vi.restoreAllMocks();
    sendAnalyticsEvent.mockClear();
    captureException.mockClear();
  });

  it('개인화 질문이 공통 질문과 같은 풀에서 뽑혀 노출된다', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '그날 산책길에서 어떤 기분이었어요?' }] }),
    );
    renderPage();

    expect(await screen.findByText(/산책길에서 어떤 기분/)).toBeInTheDocument();
  });

  it('공통 질문이 2개뿐이어도 개인화 질문을 더해 3개가 되면 세션을 시작한다', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '개인화 질문입니다' }] }),
    );
    renderPage();

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/질문을 불러오지 못했어요/)).not.toBeInTheDocument();
  });

  it('이미 답한 개인화 질문은 다시 노출되지 않는다', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({
        questions: [{ id: 'pq-1', question: '이미 답한 질문입니다', answeredAt: '2026-10-17T00:00:00Z' }],
      }),
    );
    renderPage();

    expect(await screen.findByText('질문3')).toBeInTheDocument();
    expect(screen.queryByText(/이미 답한 질문/)).not.toBeInTheDocument();
  });

  it('본인의 최근 공개 글 10개 중 10일 이내 글만 조회한다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-18T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const onRequest = vi.fn();
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [], onRequest }),
    );
    renderPage();

    await screen.findByRole('textbox');

    const { searchParams } = onRequest.mock.calls[0][0] as URL;
    expect(searchParams.get('author_id')).toBe('eq.alice');
    expect(searchParams.get('visibility')).toBe('eq.public');
    expect(searchParams.get('limit')).toBe('10');
    expect(searchParams.get('created_at')).toBe('gte.2026-10-08T00:00:00.000Z');
  });

  it('개인화 질문을 불러오지 못하면 공통 질문만으로 세션을 시작한다', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsErrorHandler(),
    );
    renderPage();

    expect(await screen.findByText('질문1')).toBeInTheDocument();
    expect(screen.queryByText(/질문을 불러오지 못했어요/)).not.toBeInTheDocument();
    expect(captureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tags: { feature: 'personalized-questions', op: 'read' } }),
    );
  });

  it('공통 질문 1개와 개인화 질문 1개로는 3개를 채우지 못해 시작하지 못한다', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '개인화 질문입니다' }] }),
    );
    renderPage();

    expect(await screen.findByText(/질문을 불러오지 못했어요/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('로그인 정보가 없으면 개인화 질문을 조회하지 않고 공통 질문으로 시작한다', async () => {
    authState.user = null;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const onRequest = vi.fn();
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '개인화 질문입니다' }], onRequest }),
    );
    renderPage();

    expect(await screen.findByText('질문1')).toBeInTheDocument();
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('개인화 질문이 하나도 없으면 공통 질문만으로 세션을 시작한다', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [] }),
    );
    renderPage();

    expect(await screen.findByText('질문1')).toBeInTheDocument();
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe('개인화 질문에 답하고 3줄쓰기를 마칠 때', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '그날 산책길에서 어떤 기분이었어요?' }] }),
      createPostHandler(),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sendAnalyticsEvent.mockClear();
    captureException.mockClear();
  });

  it('답한 개인화 질문은 다시 나오지 않도록 답변 시각이 기록된다', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    server.use(answerPersonalizedQuestionsHandler({ onUpdate }));
    renderPage();

    await screen.findByText(/산책길에서 어떤 기분/);
    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');
    await screen.findByText('게시글 상세');

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    const [url, body] = onUpdate.mock.calls[0];
    expect((url as URL).searchParams.get('id')).toBe('in.(pq-1)');
    expect((body as { answered_at: string }).answered_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('권한 정책 때문에 아무 행도 갱신되지 않으면 조용히 넘기지 않고 보고한다', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    server.use(answerPersonalizedQuestionsHandler({ onUpdate, matchesNoRows: true }));
    renderPage();

    await screen.findByText(/산책길에서 어떤 기분/);
    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');

    expect(await screen.findByText('게시글 상세')).toBeInTheDocument();
    await waitFor(() =>
      expect(captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ tags: { feature: 'personalized-questions', op: 'consume' } }),
      ),
    );
  });

  it('답변 시각 기록에 실패해도 게시글 상세로 이동한다', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    server.use(answerPersonalizedQuestionsHandler({ onUpdate, fail: true }));
    renderPage();

    await screen.findByText(/산책길에서 어떤 기분/);
    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');

    expect(await screen.findByText('게시글 상세')).toBeInTheDocument();
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(toastError).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(captureException).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tags: { feature: 'personalized-questions', op: 'consume' } }),
      ),
    );
  });

  it('답한 개인화 질문이 여럿이면 한 번에 모두 기록한다', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    server.use(
      personalizedQuestionsHandler({
        questions: [
          { id: 'pq-1', question: '첫 번째 개인화 질문입니다' },
          { id: 'pq-2', question: '두 번째 개인화 질문입니다' },
        ],
      }),
      answerPersonalizedQuestionsHandler({ onUpdate }),
    );
    renderPage();

    await screen.findByText(/개인화 질문입니다/);
    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');
    await screen.findByText('게시글 상세');

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    const [url] = onUpdate.mock.calls[0];
    expect((url as URL).searchParams.get('id')).toMatch(/pq-1/);
    expect((url as URL).searchParams.get('id')).toMatch(/pq-2/);
    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      'finish_just_three_questions',
      expect.objectContaining({ personalized_answer_count: 2 }),
    );
  });

  it('상세 페이지로 떠난 뒤 소진 처리가 끝나도 다시 3줄쓰기에 들어오면 답한 질문은 나오지 않는다', async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const fixtures = [{ id: 'pq-1', question: PERSONALIZED_QUESTION_TEXT, answeredAt: null as string | null }];
    let finishConsuming: () => void = () => {};
    const consumingFinishes = new Promise<void>((resolve) => {
      finishConsuming = resolve;
    });
    server.use(
      personalizedQuestionsHandler({ questions: fixtures }),
      answerPersonalizedQuestionsHandler({
        respondAfter: consumingFinishes,
        onUpdate: () => {
          fixtures[0].answeredAt = '2026-10-18T00:00:00Z';
        },
      }),
    );
    const removeQueries = vi.spyOn(queryClient, 'removeQueries');
    const firstVisit = renderPage(queryClient);

    await screen.findByText(PERSONALIZED_QUESTION_TEXT);
    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');
    await screen.findByText('게시글 상세');
    firstVisit.unmount();
    finishConsuming();
    await waitFor(() => expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['justThreeQuestions'] }));
    renderPage(queryClient);

    expect(await screen.findByText('질문3')).toBeInTheDocument();
    expect(screen.queryByText(PERSONALIZED_QUESTION_TEXT)).not.toBeInTheDocument();
  });

  it('개인화 질문을 건너뛰면 답변 시각을 기록하지 않아 다시 나올 수 있다', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    server.use(answerPersonalizedQuestionsHandler({ onUpdate }));
    renderPage();

    await screen.findByText(/산책길에서 어떤 기분/);
    await user.click(screen.getByRole('button', { name: '다음 질문' }));
    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');
    await screen.findByText('게시글 상세');

    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('3줄쓰기 분석 이벤트에 질문 유형을 남길 때', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sendAnalyticsEvent.mockClear();
  });

  it('첫 질문이 개인화 질문이면 시작 이벤트에 개인화 유형이 실린다', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '그날 산책길에서 어떤 기분이었어요?' }] }),
    );
    renderPage();

    await screen.findByText(/산책길에서 어떤 기분/);

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      'start_just_three_questions',
      expect.objectContaining({ question_type: 'personalized' }),
    );
  });

  it('첫 질문이 공통 질문이면 시작 이벤트에 공통 유형이 실린다', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '그날 산책길에서 어떤 기분이었어요?' }] }),
    );
    renderPage();

    await screen.findByText('질문1');

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      'start_just_three_questions',
      expect.objectContaining({ question_type: 'common' }),
    );
  });

  it('개인화 질문을 건너뛰면 스킵 이벤트에 개인화 유형이 실린다', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '그날 산책길에서 어떤 기분이었어요?' }] }),
    );
    renderPage();

    await screen.findByText(/산책길에서 어떤 기분/);
    await user.click(screen.getByRole('button', { name: '다음 질문' }));

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      'skip_just_three_question',
      expect.objectContaining({ boardId: 'board-1', question_type: 'personalized' }),
    );
  });

  it('공통 질문을 건너뛰면 스킵 이벤트에 공통 유형이 실린다', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3', '질문4'] }),
      personalizedQuestionsHandler({ questions: [] }),
    );
    renderPage();

    await screen.findByText('질문1');
    await user.click(screen.getByRole('button', { name: '다음 질문' }));

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      'skip_just_three_question',
      expect.objectContaining({ question_type: 'common' }),
    );
  });

  it('개인화 질문에 답하고 마치면 완료 이벤트에 개인화 유형과 답한 개수가 실린다', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [{ id: 'pq-1', question: '그날 산책길에서 어떤 기분이었어요?' }] }),
      createPostHandler(),
      answerPersonalizedQuestionsHandler(),
    );
    renderPage();

    await screen.findByText(/산책길에서 어떤 기분/);
    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');
    await screen.findByText('게시글 상세');

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      'finish_just_three_questions',
      expect.objectContaining({ question_type: 'personalized', personalized_answer_count: 1 }),
    );
  });

  it('공통 질문에만 답하고 마치면 완료 이벤트에 공통 유형이 실린다', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    server.use(
      justThreeQuestionsHandler({ questions: ['질문1', '질문2', '질문3'] }),
      personalizedQuestionsHandler({ questions: [] }),
      createPostHandler(),
    );
    renderPage();

    await screen.findByText('질문1');
    await answerAndAdvance(user, '답변1');
    await answerAndAdvance(user, '답변2');
    await answerAndAdvance(user, '답변3');
    await screen.findByText('게시글 상세');

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      'finish_just_three_questions',
      expect.objectContaining({ question_type: 'common', personalized_answer_count: 0 }),
    );
  });
});
