import { describe, expect, it } from 'vitest';
import { selectPeekPosts } from './PreviewPeekSection';

const EXPECTED_PEEK_COUNT = 8;

describe('selectPeekPosts', () => {
  it('resolves every curated id to a real shared preview post', () => {
    expect(selectPeekPosts()).toHaveLength(EXPECTED_PEEK_COUNT);
  });

  it('preserves the editorial order (curated first id leads)', () => {
    const firstPeek = selectPeekPosts()[0];
    expect(firstPeek?.title).toBe('멋쩍은 자기소개');
  });

  it('carries the fields the card renders', () => {
    const everyCardHasRenderableFields = selectPeekPosts().every(
      (post) => post.title.length > 0 && post.author.displayName.length > 0 && post.countOfComments >= 0,
    );
    expect(everyCardHasRenderableFields).toBe(true);
  });
});
