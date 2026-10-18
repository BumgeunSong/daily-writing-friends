import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Replies from './Replies';

/**
 * Mirrors Comments.error.test.tsx: a failed reply mutation must reject the
 * `onSubmit` promise so MentionableInput keeps the draft instead of clearing
 * it. The double reports the resolve/reject outcome it observed.
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

vi.mock('./ReplyList', () => ({ default: () => null }));

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { uid: 'u1', displayName: 'U' } }),
}));

vi.mock('@/comment/hooks/useReplyCount', () => ({
  useReplyCount: () => ({ replyCount: 0 }),
}));

vi.mock('@/comment/hooks/useCreateReply', () => ({
  useCreateReply: () => ({ mutateAsync }),
}));

vi.mock('sonner', () => ({ toast: { error: toastError } }));

vi.mock('@/shared/utils/analyticsUtils', () => ({
  sendAnalyticsEvent,
  AnalyticsEvent: { CREATE_REPLY: 'CREATE_REPLY' },
}));

async function expandAndFindDrive() {
  const user = userEvent.setup();
  render(<Replies boardId="b1" postId="p1" commentId="c1" />);
  await user.click(screen.getByRole('button', { name: /답글/ }));
  return user;
}

describe('Replies — submit failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects onSubmit and toasts when the reply mutation fails', async () => {
    mutateAsync.mockRejectedValue(new Error('network down'));
    const user = await expandAndFindDrive();

    await user.click(screen.getByText('drive-submit'));

    await vi.waitFor(() => expect(submitOutcome).toHaveBeenCalledWith('rejected'));
    expect(toastError).toHaveBeenCalled();
  });

  it('resolves onSubmit and does not toast when the reply mutation succeeds', async () => {
    mutateAsync.mockResolvedValue(undefined);
    const user = await expandAndFindDrive();

    await user.click(screen.getByText('drive-submit'));

    await vi.waitFor(() => expect(submitOutcome).toHaveBeenCalledWith('resolved'));
    expect(toastError).not.toHaveBeenCalled();
    expect(sendAnalyticsEvent).toHaveBeenCalled();
  });
});
