import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import PreviewBoardPage from './PreviewBoardPage';
import { PREVIEW_POSTS } from '@/preview/data/previewPosts';
import { withProviders } from '@/test/utils/withProviders';

/**
 * Integration coverage for the public preview board (design doc §7, §9 step 2).
 *
 * The preview is static and read-only, so no MSW handlers are needed — the page
 * reads `PREVIEW_POSTS` directly. We mount it under a MemoryRouter at `/preview`
 * and assert two contracts:
 *   1. navigation isolation: no rendered link escapes to a real app route, and
 *   2. a card smoke: the first post's title, author, and comment count render.
 *
 * `useAuth`/`AuthProvider` are stubbed (matching the `RecentPostCardList`
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
function renderPreviewBoard() {
  const { Wrapper } = withProviders();
  return render(
    <MemoryRouter initialEntries={['/preview']}>
      <Wrapper>
        <PreviewBoardPage />
      </Wrapper>
    </MemoryRouter>,
  );
}

describe('PreviewBoardPage — navigation isolation + card smoke', () => {
  it('every rendered link points only to /join or /preview/*', () => {
    renderPreviewBoard();

    // queryAllByRole never throws on an empty match, so the rule still holds
    // (vacuously) if the preview renders zero anchors today — and immediately
    // catches a future regression that introduces an escaping <a href>.
    const links = screen.queryAllByRole('link');
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(href === '/join' || href.startsWith('/preview')).toBe(true);
    }
  });

  it('renders the first preview post card with title, author, and comment count', () => {
    renderPreviewBoard();

    const post = PREVIEW_POSTS[0];

    // PostCard renders both a mobile (`lg:hidden`) and a desktop (`lg:block`)
    // layout branch, so the title and author appear twice in the DOM —
    // getAllByText avoids a false multiple-match failure.
    expect(screen.getAllByText(post.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(post.author.displayName).length).toBeGreaterThan(0);

    // PostCardFooter renders comments + replies summed together, once per card.
    const totalCount = post.countOfComments + post.countOfReplies;
    expect(screen.getByText(String(totalCount))).toBeInTheDocument();
  });
});
