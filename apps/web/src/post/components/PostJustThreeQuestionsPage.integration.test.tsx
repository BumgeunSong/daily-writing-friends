import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostJustThreeQuestionsPage from './PostJustThreeQuestionsPage';
import { server } from '@/test/msw/server';
import { createPostErrorHandler, createPostHandler } from '@/test/msw/handlers/posts';
import {
  justThreeQuestionsErrorHandler,
  justThreeQuestionsHandler,
  justThreeQuestionsPendingHandler,
} from '@/test/msw/handlers/justThreeQuestions';
import { withProviders } from '@/test/utils/withProviders';

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
const TEST_QUESTIONS = ['질문1', '질문2', '질문3', '질문4', '질문5'];

vi.mock('@/shared/hooks/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks/useAuth')>(
    '@/shared/hooks/useAuth',
  );
  return {
    ...actual,
    useAuth: () => ({ currentUser: SIGNED_IN_USER, loading: false }),
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

function renderPage() {
  const { Wrapper } = withProviders();
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
    server.use(justThreeQuestionsHandler({ questions: TEST_QUESTIONS }));
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
