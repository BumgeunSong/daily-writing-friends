import { describe, expect, it } from 'vitest';
import { resolveCommunityThread } from './CommunityThreadPreview';

describe('resolveCommunityThread', () => {
  it('finds the curated thread in shared preview content', () => {
    expect(resolveCommunityThread()).not.toBeNull();
  });

  it('has at least one reply authored by the post author (글쓴이)', () => {
    const thread = resolveCommunityThread();
    const hasPostAuthorReply = thread?.comment.replies.some(
      (reply) => reply.author.id === thread.post.author.id,
    );
    expect(hasPostAuthorReply).toBe(true);
  });

  it('keeps the thread bodies as plain text (no HTML tags to render)', () => {
    const thread = resolveCommunityThread();
    const bodies = [thread?.comment.body ?? '', ...(thread?.comment.replies.map((r) => r.body) ?? [])];
    const everyBodyIsPlainText = bodies.every((body) => !body.includes('<'));
    expect(everyBodyIsPlainText).toBe(true);
  });
});
