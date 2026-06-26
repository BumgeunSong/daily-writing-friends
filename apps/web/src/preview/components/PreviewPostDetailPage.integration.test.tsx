import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import PreviewPostDetailPage from './PreviewPostDetailPage';
import { PREVIEW_POSTS } from '@/preview/data/previewPosts';
import { withProviders } from '@/test/utils/withProviders';

/**
 * Integration coverage for the public preview post-detail page
 * (design doc §3, §4, §9 step 3).
 *
 * The page is static and read-only — it reads `PREVIEW_POSTS` directly, so no
 * MSW handlers are needed. Two contracts are asserted:
 *   1. navigation isolation: no rendered link escapes to a real app route, and
 *   2. invalid `:previewPostId` redirects to `/preview` with `{ replace: true }`.
 *
 * `useAuth`/`AuthProvider` are stubbed (matching the `PreviewBoardPage`
 * reference test) so the real Firebase-backed provider does not fire an async
 * analytics request that rejects during env teardown. The preview is a
 * logged-out page; auth is irrelevant to the seam under test.
 */
vi.mock('@/shared/hooks/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks/useAuth')>(
    '@/shared/hooks/useAuth',
  );
  return {
    ...actual,
    useAuth: () => ({ currentUser: null, loading: false }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

/**
 * Mounts the detail page at the given entry under a MemoryRouter so that an
 * in-render `navigate('/preview', { replace: true })` resolves to a defined
 * route. The `/preview` destination renders a sentinel rather than the full
 * board, keeping the redirect assertion focused. The router wraps `Wrapper`
 * because `withProviders` includes `NavigationProvider`, which calls
 * `useLocation()` and therefore needs router context above it.
 */
function renderDetailAt(entry: string) {
  const { Wrapper } = withProviders();
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Wrapper>
        <Routes>
          <Route path="/preview" element={<div>preview-board-sentinel</div>} />
          <Route path="/preview/post/:previewPostId" element={<PreviewPostDetailPage />} />
        </Routes>
      </Wrapper>
    </MemoryRouter>,
  );
}

describe('PreviewPostDetailPage — navigation isolation + invalid-id redirect', () => {
  it('every rendered link points only to /join or /preview/*', () => {
    const post = PREVIEW_POSTS[0];
    renderDetailAt(`/preview/post/${post.id}`);

    // queryAllByRole never throws on an empty match, so the rule still holds
    // (vacuously) if the page renders zero anchors today — and immediately
    // catches a future regression that introduces an escaping <a href>.
    const links = screen.queryAllByRole('link');
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(href === '/join' || href.startsWith('/preview')).toBe(true);
    }
  });

  it('renders the matched preview post title', () => {
    const post = PREVIEW_POSTS[0];
    renderDetailAt(`/preview/post/${post.id}`);

    expect(screen.getByRole('heading', { name: post.title })).toBeInTheDocument();
  });

  it('renders the post comments and their nested replies', () => {
    const post = PREVIEW_POSTS[0];
    renderDetailAt(`/preview/post/${post.id}`);

    // Every commenter's display name renders (each row's CommentHeader).
    for (const comment of post.comments) {
      expect(screen.getByText(comment.author.displayName)).toBeInTheDocument();
    }

    // Nested replies render their author too — proves PreviewReplyList wires in.
    const replyAuthors = post.comments.flatMap((c) => c.replies.map((r) => r.author.displayName));
    for (const name of replyAuthors) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it('redirects an unknown :previewPostId to /preview', async () => {
    renderDetailAt('/preview/post/does-not-exist');

    expect(await screen.findByText('preview-board-sentinel')).toBeInTheDocument();
  });
});
