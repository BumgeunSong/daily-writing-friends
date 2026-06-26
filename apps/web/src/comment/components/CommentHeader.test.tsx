import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommentHeader } from './CommentHeader';
import type { WritingBadge } from '@/stats/model/WritingStats';

/**
 * Refactor 1 no-op proof: the new optional `badges` prop must let callers skip
 * the internal usePostProfileBadges fetch. When omitted, behavior is unchanged
 * (the hook still fires).
 */

const fetchCommentingData = vi.hoisted(() => vi.fn(() => Promise.resolve({ commentings: [], replyings: [] })));

vi.mock('@/stats/api/stats', () => ({
  fetchCommentingData,
}));

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: Infinity, staleTime: Infinity } },
  });
}

function renderHeader(extraProps: Partial<React.ComponentProps<typeof CommentHeader>> = {}) {
  return render(
    <QueryClientProvider client={createClient()}>
      <CommentHeader
        userId='pv-author-1'
        fallbackName='이몽룡'
        fallbackProfileImage=''
        {...extraProps}
      />
    </QueryClientProvider>,
  );
}

describe('CommentHeader badges prop (Refactor 1)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders provided badges without firing the profile-badges fetch', async () => {
    const badges: WritingBadge[] = [{ name: '36℃', emoji: '🌡️' }];
    renderHeader({ badges });

    expect(screen.getByText('이몽룡')).toBeInTheDocument();
    expect(screen.getByText('36℃')).toBeInTheDocument();
    // The whole point of the prop: no wasted Supabase request for synthetic IDs.
    expect(fetchCommentingData).not.toHaveBeenCalled();
  });

  it('renders an empty badges array without firing the fetch', () => {
    renderHeader({ badges: [] });

    expect(screen.getByText('이몽룡')).toBeInTheDocument();
    expect(fetchCommentingData).not.toHaveBeenCalled();
  });

  it('falls back to the internal fetch when no badges prop is provided (real-app no-op)', async () => {
    renderHeader();

    expect(screen.getByText('이몽룡')).toBeInTheDocument();
    await vi.waitFor(() => expect(fetchCommentingData).toHaveBeenCalledTimes(1));
  });
});
