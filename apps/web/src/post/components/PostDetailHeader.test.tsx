import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PostDetailHeader } from './PostDetailHeader';
import type { PostAuthorData } from './PostUserProfile';
import { type Post, PostVisibility } from '@/post/model/Post';
import { createTimestamp } from '@/shared/model/Timestamp';
import { userProfilePath } from '@/shared/constants/routes';

const AUTHOR: PostAuthorData = { id: 'pv-author-1', displayName: '이몽룡' };

const POST: Post = {
  id: 'p1',
  boardId: 'b1',
  title: '봄날의 기록',
  content: '<p>body</p>',
  contentPreview: 'body',
  thumbnailImageURL: null,
  authorId: 'pv-author-1',
  authorName: '이몽룡',
  createdAt: createTimestamp(new Date('2026-01-15T00:00:00.000Z')),
  countOfComments: 0,
  countOfReplies: 0,
  countOfLikes: 0,
  visibility: PostVisibility.PUBLIC,
};

function renderHeader(props: Partial<React.ComponentProps<typeof PostDetailHeader>> = {}) {
  return render(
    <MemoryRouter>
      <PostDetailHeader
        post={POST}
        authorData={AUTHOR}
        isAuthorLoading={false}
        isDonator={false}
        isAuthor={false}
        onDelete={vi.fn()}
        navigate={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('게시물 상세 헤더에서 작성자 아바타를 클릭할 때', () => {
  it('작성자 프로필로 이동한다', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderHeader({ navigate });

    const avatarButtons = screen.getAllByRole('button', { name: '작성자 프로필로 이동' });
    await user.click(avatarButtons[0]);

    expect(navigate).toHaveBeenCalledWith(userProfilePath(AUTHOR.id));
  });

  it('본인 글이어도 프로필로 이동해야 한다', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderHeader({ navigate, isAuthor: true });

    const avatarButtons = screen.getAllByRole('button', { name: '작성자 프로필로 이동' });
    await user.click(avatarButtons[0]);

    expect(navigate).toHaveBeenCalledWith(userProfilePath(AUTHOR.id));
  });

  it('forwards a provided onClickProfile handler to the avatar button', async () => {
    const user = userEvent.setup();
    const onClickProfile = vi.fn();
    renderHeader({ onClickProfile });

    const avatarButtons = screen.getAllByRole('button', { name: '작성자 프로필로 이동' });
    await user.click(avatarButtons[0]);

    expect(onClickProfile).toHaveBeenCalledTimes(1);
  });
});
