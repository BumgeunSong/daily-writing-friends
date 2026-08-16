import { MemoryRouter } from 'react-router-dom';
import Comments from '@/comment/components/Comments';
import { authHandlers } from '@/test/msw/handlers/auth';
import { blocksHandler } from '@/test/msw/handlers/blocks';
import { commentsHandler } from '@/test/msw/handlers/comments';
import { reactionsHandler } from '@/test/msw/handlers/reactions';
import { repliesHandler } from '@/test/msw/handlers/replies';
import { supabaseFallthrough } from '@/test/msw/handlers/supabaseFallthrough';
import {
  makeCommentRow,
  makeReactionRow,
  type CommentRowWire,
  type ReactionRowWire,
} from '@/test/fixtures/comment';
import type { Fixture } from './types';

const BOARD_ID = 'b1';
const POST_ID = 'p1';
const POST_AUTHOR_ID = '00000000-0000-4000-8000-000000000010';

// Varying-length natural text stresses wrapping, vertical rhythm, and clipping
// across the responsive matrix — without a pathological unbreakable token, so the
// baseline render stays clean (0 violations). Overflow regressions are induced
// separately when proving the gate catches them.
const comments: CommentRowWire[] = [
  makeCommentRow({
    id: 'c1',
    content: '좋은 글 잘 읽었어요.',
    user_name: '가나',
    author: { profile_photo_url: null, nickname: '가나' },
    created_at: '2024-12-28T00:00:00.000Z',
  }),
  makeCommentRow({
    id: 'c2',
    content: '두 문장 정도 길이의 댓글이에요. 좁은 화면에서 자연스럽게 줄바꿈이 생기는지 확인하려고 조금 더 길게 썼습니다.',
    user_name: '다라마',
    author: { profile_photo_url: null, nickname: '다라마' },
    created_at: '2024-12-29T00:00:00.000Z',
  }),
  makeCommentRow({
    id: 'c3',
    content: '조금 긴 댓글. 여러 문장이 이어질 때 세로 리듬과 줄 간격이 어떻게 쌓이는지 봅니다.',
    user_name: '바사',
    author: { profile_photo_url: null, nickname: '바사' },
    created_at: '2024-12-30T00:00:00.000Z',
  }),
  makeCommentRow({
    id: 'c4',
    content: '리액션이 달린 댓글이라 ReactionList가 함께 렌더돼요.',
    user_name: '아자',
    author: { profile_photo_url: null, nickname: '아자' },
    created_at: '2024-12-31T00:00:00.000Z',
  }),
];

const reactions: ReactionRowWire[] = [
  makeReactionRow({ id: 'rx1', comment_id: 'c4', reaction_type: '👍', user_name: '반응1' }),
  makeReactionRow({
    id: 'rx2',
    comment_id: 'c4',
    reaction_type: '❤️',
    user_id: '00000000-0000-4000-8000-000000000003',
    user_name: '반응2',
  }),
];

export const commentsLongThread: Fixture = {
  name: 'comments-long-thread',
  description: '길이가 다른 댓글 4개 + 리액션. 콘텐츠 길이·반응형 회귀 표면을 렌더한다.',
  handlers: () => [
    ...authHandlers,
    blocksHandler(),
    commentsHandler({ comments }),
    reactionsHandler({ rows: reactions }),
    repliesHandler(),
    supabaseFallthrough(),
  ],
  render: () => (
    <MemoryRouter initialEntries={[`/board/${BOARD_ID}/post/${POST_ID}`]}>
      <Comments
        boardId={BOARD_ID}
        postId={POST_ID}
        postAuthorId={POST_AUTHOR_ID}
        postAuthorNickname='작성자'
        postVisibility='public'
      />
    </MemoryRouter>
  ),
};
