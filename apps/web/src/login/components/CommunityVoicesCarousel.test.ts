import { describe, expect, it } from 'vitest';
import { resolveCommunityVoices } from './CommunityVoicesCarousel';

const EXPECTED_VOICE_COUNT = 4;

describe('resolveCommunityVoices', () => {
  it('resolves every curated reference to a real comment and reply', () => {
    expect(resolveCommunityVoices()).toHaveLength(EXPECTED_VOICE_COUNT);
  });

  it('carries non-empty comment and reply bodies for the card', () => {
    const everyVoiceHasText = resolveCommunityVoices().every(
      (voice) => voice.comment.body.trim().length > 0 && voice.reply.body.trim().length > 0,
    );
    expect(everyVoiceHasText).toBe(true);
  });

  it('flags replies written by the post author as 글쓴이', () => {
    const hasAnyPostAuthorReply = resolveCommunityVoices().some((voice) => voice.isReplyByPostAuthor);
    expect(hasAnyPostAuthorReply).toBe(true);
  });

  it('keeps bodies as plain text (no HTML tags to render)', () => {
    const everyBodyIsPlainText = resolveCommunityVoices().every(
      (voice) => !voice.comment.body.includes('<') && !voice.reply.body.includes('<'),
    );
    expect(everyBodyIsPlainText).toBe(true);
  });
});
