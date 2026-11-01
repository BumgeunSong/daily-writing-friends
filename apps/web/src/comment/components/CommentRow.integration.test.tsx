import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Comment } from '@/comment/model/Comment';
import { createTimestamp } from '@/shared/model/Timestamp';
import { withProviders } from '@/test/utils/withProviders';

import CommentRow from './CommentRow';

const editComment = vi.fn((_input: { content: string; contentJson: unknown }) => Promise.resolve());

vi.mock('@/comment/hooks/useCreateComment', () => ({
  useEditComment: () => ({ mutateAsync: editComment }),
  useDeleteComment: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/comment/components/CommentHeader', () => ({ CommentHeader: () => null }));
vi.mock('@/comment/components/Replies', () => ({ default: () => null }));
vi.mock('@/comment/components/ReactionList', () => ({ default: () => null }));
vi.mock('@/user/hooks/useMentionCandidates', async () => {
  const actual = await vi.importActual<typeof import('@/user/hooks/useMentionCandidates')>(
    '@/user/hooks/useMentionCandidates',
  );
  return { ...actual, useBoardMembers: () => ({ data: [] }) };
});

beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
});

const commentWithMention: Comment = {
  id: 'c1',
  userId: 'alice',
  userName: 'Alice',
  userProfileImage: '',
  createdAt: createTimestamp(new Date('2024-12-31T00:00:00.000Z')),
  content:
    '<p>안녕 <span data-mention="" data-user-id="user-1">@Kim</span></p>',
  contentJson: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '안녕 ' },
          { type: 'mention', attrs: { id: 'user-1', label: 'Kim' } },
        ],
      },
    ],
  },
};

describe('CommentRow editing', () => {
  it('keeps an existing mention’s user id when the author edits and saves', async () => {
    const user = userEvent.setup({ delay: null });
    const { Wrapper } = withProviders();
    render(
      <MemoryRouter>
        <Wrapper>
          <CommentRow boardId="b1" postId="p1" comment={commentWithMention} isAuthor />
        </Wrapper>
      </MemoryRouter>,
    );

    const [editButton] = screen.getAllByRole('button');
    await user.click(editButton);
    await user.click(screen.getByRole('button', { name: '댓글 등록' }));

    const [{ contentJson }] = editComment.mock.calls[0];
    expect(JSON.stringify(contentJson)).toContain('"id":"user-1"');
  });
});
