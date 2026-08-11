import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Comments from './Comments';

/**
 * The draft-retention contract lives across two components: MentionableInput
 * clears its editor only when the parent `onSubmit` resolves (proven in
 * CommentInput.integration.test.tsx). So the parent MUST reject `onSubmit` when
 * the mutation fails, or a failed submit silently wipes the user's draft.
 *
 * We stand in for MentionableInput with a double that reports whether the
 * `onSubmit` promise it received resolved or rejected — that is exactly the
 * signal MentionableInput keys its clear/retain decision on.
 */

const { submitOutcome, mutateAsync, toastError, sendAnalyticsEvent } = vi.hoisted(() => ({
  submitOutcome: vi.fn(),
  mutateAsync: vi.fn(),
  toastError: vi.fn(),
  sendAnalyticsEvent: vi.fn(),
}));

vi.mock('@/comment/components/MentionableInput', () => ({
  MentionableInput: ({
    onSubmit,
  }: {
    onSubmit: (content: string, contentJson: unknown) => Promise<void>;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit('<p>hi</p>', { type: 'doc', content: [] }).then(
          () => submitOutcome('resolved'),
          () => submitOutcome('rejected'),
        )
      }
    >
      drive-submit
    </button>
  ),
}));

vi.mock('@/comment/components/CommentList', () => ({ default: () => null }));

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: { uid: 'u1', displayName: 'U' },
    verifiedUser: { uid: 'u1' },
  }),
}));

vi.mock('@/comment/hooks/useCreateComment', () => ({
  useCreateComment: () => ({ mutateAsync }),
}));

vi.mock('@/comment/hooks/useActivity', () => ({
  useActivity: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('sonner', () => ({ toast: { error: toastError } }));

vi.mock('@/shared/utils/analyticsUtils', () => ({
  sendAnalyticsEvent,
  AnalyticsEvent: { CREATE_COMMENT: 'CREATE_COMMENT' },
}));

function renderComments() {
  return render(
    <Comments boardId="b1" postId="p1" postAuthorId="a1" postAuthorNickname="작성자" />,
  );
}

describe('Comments — submit failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects onSubmit and toasts when the comment mutation fails', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error('network down'));
    renderComments();

    await user.click(screen.getByText('drive-submit'));

    await vi.waitFor(() => expect(submitOutcome).toHaveBeenCalledWith('rejected'));
    expect(toastError).toHaveBeenCalled();
  });

  it('resolves onSubmit and does not toast when the comment mutation succeeds', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValue(undefined);
    renderComments();

    await user.click(screen.getByText('drive-submit'));

    await vi.waitFor(() => expect(submitOutcome).toHaveBeenCalledWith('resolved'));
    expect(toastError).not.toHaveBeenCalled();
    expect(sendAnalyticsEvent).toHaveBeenCalled();
  });
});
