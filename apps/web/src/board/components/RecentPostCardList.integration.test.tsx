import { render, screen, waitFor } from '@testing-library/react';
import { mockAllIsIntersecting } from 'react-intersection-observer/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RecentPostCardList from './RecentPostCardList';
import type { Post } from '@/post/model/Post';
import { deduplicateAuthorIds } from '@/post/utils/batchPostCardDataUtils';
import { server } from '@/test/msw/server';
import { postsFeedErrorHandler, postsFeedHandler } from '@/test/msw/handlers/posts';
import { makePostRow, type PostRow } from '@/test/fixtures/post';
import { withProviders } from '@/test/utils/withProviders';

/**
 * Pattern 1 reference test: infinite-query list (`useRecentPosts` ↔ `posts_feed`).
 *
 * Mocks `useAuth` because the seam under test is the infinite-query cursor
 * round-trip and empty/error precedence — NOT the Supabase auth boundary.
 * Other reference patterns (PR-3 RouteGuards, PostDetailPage) exercise auth
 * for real via the auth MSW handler + sign-in.
 *
 * `useBatchPostCardData`'s 5-endpoint fanout is short-circuited by pre-seeding
 * its query cache. The contract under test is the infinite-list seam, not the
 * post-card prefetch fanout.
 */

const SIGNED_IN_USER = { uid: 'alice', email: 'alice@test.local', displayName: 'Alice', photoURL: null };

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

function renderList(opts: { posts: PostRow[]; onPostsRequest?: (url: URL) => void }) {
  const { Wrapper, queryClient } = withProviders();
  if (opts.posts.length > 0) {
    // Stay locked to useBatchPostCardData's keying so any future normalization
    // in `deduplicateAuthorIds` propagates here automatically. Casting through
    // a minimal `{authorId}` shape: the util only reads that field.
    const minimalPosts = opts.posts.map((p) => ({ authorId: p.author_id })) as Post[];
    const authorIdsKey = deduplicateAuthorIds(minimalPosts)
      .sort((a, b) => a.localeCompare(b))
      .join(',');
    queryClient.setQueryData(['batchPostCardData', authorIdsKey], new Map());
  }
  server.use(postsFeedHandler({ posts: opts.posts, onRequest: opts.onPostsRequest }));
  return render(
    <MemoryRouter>
      <Wrapper>
        <RecentPostCardList boardId="b1" onPostClick={() => {}} />
      </Wrapper>
    </MemoryRouter>,
  );
}

describe('RecentPostCardList — Pattern 1 (infinite-query list)', () => {
  beforeEach(() => {
    mockAllIsIntersecting(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders empty state with "글 쓰러 가기" CTA when no posts exist', async () => {
    renderList({ posts: [] });

    expect(await screen.findByText('게시판이 비어있어요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '글 쓰러 가기' })).toBeInTheDocument();
  });

  it('renders error message (and NOT empty CTA) when posts_feed returns 500', async () => {
    server.use(postsFeedErrorHandler());
    const { Wrapper } = withProviders();
    render(
      <MemoryRouter>
        <Wrapper>
          <RecentPostCardList boardId="b1" onPostClick={() => {}} />
        </Wrapper>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/글을 불러오는 중에 문제가 생겼어요/),
    ).toBeInTheDocument();
    expect(screen.queryByText('게시판이 비어있어요')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '글 쓰러 가기' })).not.toBeInTheDocument();
  });

  it('renders first page and fetches next page with created_at cursor when sentinel intersects', async () => {
    const requests: URL[] = [];
    const posts: PostRow[] = [
      makePostRow({ id: 'p1', title: 'Newest', created_at: '2026-01-15T00:00:00.000Z' }),
      makePostRow({ id: 'p2', title: 'Middle', created_at: '2026-01-10T00:00:00.000Z' }),
      makePostRow({ id: 'p3', title: 'Oldest', created_at: '2026-01-05T00:00:00.000Z' }),
    ];
    renderList({ posts, onPostsRequest: (url) => requests.push(url) });

    const cards = await screen.findAllByRole('button', { name: '게시글 상세로 이동' });
    expect(cards.length).toBeGreaterThanOrEqual(3);

    expect(requests.length).toBeGreaterThanOrEqual(1);
    expect(requests[0].searchParams.has('created_at')).toBe(false);

    mockAllIsIntersecting(true);

    await waitFor(() => {
      const cursorCalls = requests.filter((u) => u.searchParams.get('created_at')?.startsWith('lt.'));
      expect(cursorCalls.length).toBeGreaterThanOrEqual(1);
    });

    const cursorIso = requests
      .find((u) => u.searchParams.get('created_at')?.startsWith('lt.'))!
      .searchParams.get('created_at')!
      .slice('lt.'.length);
    expect(cursorIso).toBe('2026-01-05T00:00:00.000Z');
  });

  it('keeps next-page fetches bounded when the sentinel toggles rapidly', async () => {
    // Pagination is exhausted after one cursor fetch (second page is empty).
    // The point of this test: rapid sentinel toggles must NEVER trigger a
    // runaway loop. Even if React Query's in-flight dedup or the effect's
    // closure timing produce 1–2 cursor requests, the count stays bounded.
    const requests: URL[] = [];
    const posts: PostRow[] = [
      makePostRow({ id: 'p1', created_at: '2026-01-15T00:00:00.000Z' }),
      makePostRow({ id: 'p2', created_at: '2026-01-10T00:00:00.000Z' }),
    ];
    renderList({ posts, onPostsRequest: (url) => requests.push(url) });

    await screen.findAllByRole('button', { name: '게시글 상세로 이동' });

    mockAllIsIntersecting(true);
    mockAllIsIntersecting(false);
    mockAllIsIntersecting(true);

    await waitFor(() => {
      const cursorCalls = requests.filter((u) => u.searchParams.get('created_at')?.startsWith('lt.'));
      expect(cursorCalls.length).toBeGreaterThanOrEqual(1);
    });

    const cursorRequestsCount = requests.filter((u) =>
      u.searchParams.get('created_at')?.startsWith('lt.'),
    ).length;
    expect(cursorRequestsCount).toBeLessThanOrEqual(2);
  });
});
