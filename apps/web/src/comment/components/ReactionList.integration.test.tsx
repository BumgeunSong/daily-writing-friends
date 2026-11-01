import { render, screen } from '@testing-library/react';
import { http } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import {
  makeCommentRow,
  makeReactionRow,
  type ReactionRowWire,
} from '@/test/fixtures/comment';
import { commentsHandler } from '@/test/msw/handlers/comments';
import { reactionsHandler } from '@/test/msw/handlers/reactions';
import { server } from '@/test/msw/server';
import { withProviders } from '@/test/utils/withProviders';

import ReactionList from './ReactionList';

const SIGNED_IN_USER = { uid: 'alice', email: 'alice@test.local', displayName: 'Alice', photoURL: null };

vi.mock('@/shared/hooks/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks/useAuth')>(
    '@/shared/hooks/useAuth',
  );
  return {
    ...actual,
    useAuth: () => ({
      authState: { status: 'signedIn', user: SIGNED_IN_USER },
      currentUser: SIGNED_IN_USER,
      verifiedUser: SIGNED_IN_USER,
      loading: false,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const COMMENTS = ['c1', 'c2', 'c3'].map((id) => makeCommentRow({ id, post_id: 'p1' }));

function countReactionRequests(rows: ReactionRowWire[]) {
  const requests: string[] = [];
  server.use(
    http.get(/\/rest\/v1\/reactions/, (info) => {
      requests.push(info.request.url);
      return undefined;
    }),
    commentsHandler({ comments: COMMENTS }),
    reactionsHandler({ rows }),
  );
  return requests;
}

function renderCommentReactionLists() {
  const { Wrapper } = withProviders();
  render(
    <MemoryRouter>
      <Wrapper>
        {COMMENTS.map((comment) => (
          <ReactionList
            key={comment.id}
            entity={{ type: 'comment', boardId: 'b1', postId: 'p1', commentId: comment.id }}
          />
        ))}
      </Wrapper>
    </MemoryRouter>,
  );
}

describe('ReactionList for comments', () => {
  it('loads every comment’s reactions with a single request', async () => {
    const requests = countReactionRequests([
      makeReactionRow({ id: 'r1', comment_id: 'c1', reaction_type: '👍' }),
      makeReactionRow({ id: 'r2', comment_id: 'c3', reaction_type: '❤️' }),
    ]);

    renderCommentReactionLists();

    expect(await screen.findByText('👍')).toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(requests).toHaveLength(1);
  });
});
