import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrefetchPost } from './usePrefetchPost';
import * as postUtilsModule from '@/post/utils/postUtils';
import { PostVisibility, type Post } from '@/post/model/Post';
import { createTimestamp } from '@/shared/model/Timestamp';
import type { ReactNode } from 'react';

vi.mock('@/post/utils/postUtils');
const fetchPostMock = vi.mocked(postUtilsModule.fetchPost);

const samplePost: Post = {
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

function withClient(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchPostMock.mockResolvedValue(samplePost);
});

describe('usePrefetchPost', () => {
  it('fetches the post when cache is cold', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
    renderHook(() => usePrefetchPost('b1', 'p1'), { wrapper: withClient(client) });
    await waitFor(() => expect(fetchPostMock).toHaveBeenCalledWith('b1', 'p1'));
  });

  it('populates [post, boardId, postId] cache key (matches postDetailLoader + PostDetailPage)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
    renderHook(() => usePrefetchPost('b1', 'p1'), { wrapper: withClient(client) });
    await waitFor(() =>
      expect(client.getQueryData(['post', 'b1', 'p1'])).toEqual(samplePost),
    );
  });

  it('skips re-fetching when cache is fresh (dedup across multiple list items)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
    client.setQueryData(['post', 'b1', 'p1'], samplePost);
    renderHook(() => usePrefetchPost('b1', 'p1'), { wrapper: withClient(client) });
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchPostMock).not.toHaveBeenCalled();
  });
});
