import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getReactions } from '@/comment/api/reaction';
import { useReactions } from '@/comment/hooks/useReactions';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@/comment/api/reaction', () => ({
  getReactions: vi.fn(),
  createReaction: vi.fn(),
  deleteUserReaction: vi.fn(),
}));

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: null }),
}));

vi.mock('@/user/api/user', () => ({
  fetchUser: vi.fn(),
}));

function setupUseReactionsMocks() {
  vi.clearAllMocks();

  vi.mocked(useQueryClient).mockReturnValue({
    invalidateQueries: vi.fn(),
  } as never);

  vi.mocked(useMutation).mockReturnValue({
    mutateAsync: vi.fn(),
  } as never);
}

describe('useReactions for comments', () => {
  beforeEach(() => {
    setupUseReactionsMocks();
  });

  it('builds query key and params from entity comment ids', async () => {
    const querySpy = vi.fn().mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    vi.mocked(useQuery).mockImplementation(querySpy as never);
    vi.mocked(getReactions).mockResolvedValue([]);

    useReactions({
      entity: { type: 'comment', boardId: 'board-1', postId: 'post-1', commentId: 'comment-1' },
    });

    const queryOptions = querySpy.mock.calls[0]?.[0];
    expect(queryOptions.queryKey).toEqual(['reactions', 'board-1', 'post-1', 'comment-1', undefined]);

    await queryOptions.queryFn();
    expect(getReactions).toHaveBeenCalledWith({
      boardId: 'board-1',
      postId: 'post-1',
      commentId: 'comment-1',
    });
  });
});

describe('useReactions for replies', () => {
  beforeEach(() => {
    setupUseReactionsMocks();
  });

  it('builds reply query key and params from entity ids', async () => {
    const querySpy = vi.fn().mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    vi.mocked(useQuery).mockImplementation(querySpy as never);
    vi.mocked(getReactions).mockResolvedValue([]);

    useReactions({
      entity: {
        type: 'reply',
        boardId: 'board-2',
        postId: 'post-2',
        commentId: 'comment-2',
        replyId: 'reply-2',
      },
    });

    const queryOptions = querySpy.mock.calls[0]?.[0];
    expect(queryOptions.queryKey).toEqual(['reactions', 'board-2', 'post-2', 'comment-2', 'reply-2']);

    await queryOptions.queryFn();
    expect(getReactions).toHaveBeenCalledWith({
      boardId: 'board-2',
      postId: 'post-2',
      commentId: 'comment-2',
      replyId: 'reply-2',
    });
  });
});
