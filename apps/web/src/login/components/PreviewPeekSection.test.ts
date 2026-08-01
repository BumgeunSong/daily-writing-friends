import { describe, expect, it } from 'vitest';
import { PREVIEW_POSTS } from '@/shared/preview-content/previewPosts';
import { selectPeekPosts } from './PreviewPeekSection';

const EXPECTED_PEEK_COUNT = 8;

describe('selectPeekPosts', () => {
  it('returns exactly the peek count of posts', () => {
    expect(selectPeekPosts(0)).toHaveLength(EXPECTED_PEEK_COUNT);
  });

  it('is deterministic for a given hour seed', () => {
    expect(selectPeekPosts(1234).map((post) => post.id)).toEqual(
      selectPeekPosts(1234).map((post) => post.id),
    );
  });

  it('rotates the selection as the hour seed advances', () => {
    const thisHour = selectPeekPosts(1000).map((post) => post.id);
    const nextHour = selectPeekPosts(1001).map((post) => post.id);
    expect(nextHour).not.toEqual(thisHour);
  });

  it('draws only real, non-duplicated posts from the shared pool', () => {
    const picks = selectPeekPosts(42);
    const poolIds = new Set(PREVIEW_POSTS.map((post) => post.id));
    const everyPickIsInPool = picks.every((post) => poolIds.has(post.id));
    const uniqueIds = new Set(picks.map((post) => post.id));

    expect(everyPickIsInPool).toBe(true);
    expect(uniqueIds.size).toBe(picks.length);
  });

  it('carries the fields the card renders', () => {
    const everyCardHasRenderableFields = selectPeekPosts(7).every(
      (post) => post.title.length > 0 && post.author.displayName.length > 0 && post.countOfComments >= 0,
    );
    expect(everyCardHasRenderableFields).toBe(true);
  });
});
