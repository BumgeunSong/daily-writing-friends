import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postDetailLoader } from './usePostDetailLoader';
import { queryClient } from '@/shared/lib/queryClient';
import * as postUtilsModule from '@/post/utils/postUtils';
import * as userApi from '@/user/api/user';
import * as authUtils from '@/shared/utils/authUtils';
import { PostVisibility, type Post } from '@/post/model/Post';
import { createTimestamp } from '@/shared/model/Timestamp';

vi.mock('@/post/utils/postUtils');
vi.mock('@/user/api/user');
vi.mock('@/shared/utils/authUtils');

const fetchPostMock = vi.mocked(postUtilsModule.fetchPost);
const fetchUserMock = vi.mocked(userApi.fetchUser);
const getCurrentUserMock = vi.mocked(authUtils.getCurrentUser);

const post: Post = {
  id: 'p1',
  boardId: 'b1',
  title: 't',
  content: 'c',
  thumbnailImageURL: null,
  authorId: 'a1',
  authorName: 'A',
  countOfComments: 0,
  countOfReplies: 0,
  countOfLikes: 0,
  createdAt: createTimestamp(new Date('2026-01-01T00:00:00Z')),
  visibility: PostVisibility.PUBLIC,
};
const userData = { uid: 'a1', boardPermissions: { b1: 'read' } } as never;

beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({ uid: 'a1' } as never);
  fetchUserMock.mockResolvedValue(userData);
  fetchPostMock.mockResolvedValue(post);
});

describe('postDetailLoader cache-warm short-circuit', () => {
  it('does NOT call fetchPost or fetchUser when both keys are pre-seeded', async () => {
    queryClient.setQueryData(['post', 'b1', 'p1'], post);
    queryClient.setQueryData(['user', 'a1'], userData);
    await postDetailLoader({
      params: { boardId: 'b1', postId: 'p1' },
      request: new Request('http://x/'),
    } as never);
    expect(fetchPostMock).not.toHaveBeenCalled();
    expect(fetchUserMock).not.toHaveBeenCalled();
  });

  it('calls fetchPost and fetchUser when cache is cold (unchanged cold-path behavior)', async () => {
    await postDetailLoader({
      params: { boardId: 'b1', postId: 'p1' },
      request: new Request('http://x/'),
    } as never);
    expect(fetchPostMock).toHaveBeenCalledWith('b1', 'p1');
    expect(fetchUserMock).toHaveBeenCalledWith('a1');
  });

  it('uses the same cache key as PostDetailPage useQuery (regression guard)', async () => {
    queryClient.setQueryData(['post', 'b1', 'p1'], post);
    queryClient.setQueryData(['user', 'a1'], userData);
    await postDetailLoader({
      params: { boardId: 'b1', postId: 'p1' },
      request: new Request('http://x/'),
    } as never);
    expect(fetchPostMock).not.toHaveBeenCalled();
  });
});
