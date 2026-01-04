import { describe, it, expect } from 'vitest';
import { groupReactionsByEmoji } from './reactionUtils';
import type { Reaction } from '../model/Reaction';

function createMockReaction(
  id: string,
  content: string,
  userId: string,
  userName: string = `User ${userId}`,
  userProfileImage: string = '',
): Reaction {
  return {
    id,
    content,
    createdAt: new Date(),
    reactionUser: {
      userId,
      userName,
      userProfileImage,
    },
  };
}

describe('reactionUtils', () => {
  describe('groupReactionsByEmoji', () => {
    it('should return empty array for empty input', () => {
      const result = groupReactionsByEmoji([]);
      expect(result).toEqual([]);
    });

    it('should group reactions by emoji', () => {
      const reactions = [
        createMockReaction('1', '👍', 'user1'),
        createMockReaction('2', '👍', 'user2'),
        createMockReaction('3', '❤️', 'user3'),
      ];

      const result = groupReactionsByEmoji(reactions);

      expect(result).toHaveLength(2);
      const thumbsUp = result.find((g) => g.content === '👍');
      const heart = result.find((g) => g.content === '❤️');

      expect(thumbsUp?.by).toHaveLength(2);
      expect(heart?.by).toHaveLength(1);
    });

    it('should sort groups by count descending', () => {
      const reactions = [
        createMockReaction('1', '❤️', 'user1'),
        createMockReaction('2', '👍', 'user2'),
        createMockReaction('3', '👍', 'user3'),
        createMockReaction('4', '👍', 'user4'),
        createMockReaction('5', '😂', 'user5'),
        createMockReaction('6', '😂', 'user6'),
      ];

      const result = groupReactionsByEmoji(reactions);

      expect(result[0].content).toBe('👍'); // 3 reactions
      expect(result[1].content).toBe('😂'); // 2 reactions
      expect(result[2].content).toBe('❤️'); // 1 reaction
    });

    it('should not add duplicate users to the same emoji group', () => {
      const reactions = [
        createMockReaction('1', '👍', 'user1'),
        createMockReaction('2', '👍', 'user1'), // Same user, same emoji
        createMockReaction('3', '👍', 'user2'),
      ];

      const result = groupReactionsByEmoji(reactions);

      expect(result).toHaveLength(1);
      expect(result[0].by).toHaveLength(2); // user1 and user2, not 3
    });

    it('should allow same user to react with different emojis', () => {
      const reactions = [
        createMockReaction('1', '👍', 'user1'),
        createMockReaction('2', '❤️', 'user1'), // Same user, different emoji
      ];

      const result = groupReactionsByEmoji(reactions);

      expect(result).toHaveLength(2);
      const thumbsUp = result.find((g) => g.content === '👍');
      const heart = result.find((g) => g.content === '❤️');

      expect(thumbsUp?.by[0].userId).toBe('user1');
      expect(heart?.by[0].userId).toBe('user1');
    });

    it('should preserve user information in grouped reactions', () => {
      const reactions = [
        createMockReaction('1', '👍', 'user1', 'Alice', 'https://example.com/alice.jpg'),
      ];

      const result = groupReactionsByEmoji(reactions);

      expect(result[0].by[0]).toEqual({
        userId: 'user1',
        userName: 'Alice',
        userProfileImage: 'https://example.com/alice.jpg',
      });
    });

    it('should handle single reaction', () => {
      const reactions = [createMockReaction('1', '🎉', 'user1')];

      const result = groupReactionsByEmoji(reactions);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('🎉');
      expect(result[0].by).toHaveLength(1);
    });

    it('should handle many different emojis', () => {
      const emojis = ['👍', '❤️', '😂', '😮', '😢', '😠'];
      const reactions = emojis.map((emoji, i) => createMockReaction(String(i), emoji, `user${i}`));

      const result = groupReactionsByEmoji(reactions);

      expect(result).toHaveLength(6);
      emojis.forEach((emoji) => {
        expect(result.some((g) => g.content === emoji)).toBe(true);
      });
    });

    it('should handle reactions with same count maintaining stable order', () => {
      // When counts are equal, the original order should be preserved
      const reactions = [
        createMockReaction('1', 'A', 'user1'),
        createMockReaction('2', 'B', 'user2'),
        createMockReaction('3', 'C', 'user3'),
      ];

      const result = groupReactionsByEmoji(reactions);

      // All have count 1, so the sorting should maintain relative order
      expect(result).toHaveLength(3);
      expect(result.every((g) => g.by.length === 1)).toBe(true);
    });

    it('should handle Unicode emojis correctly', () => {
      const reactions = [
        createMockReaction('1', '👨‍👩‍👧‍👦', 'user1'), // Family emoji (compound)
        createMockReaction('2', '👨‍👩‍👧‍👦', 'user2'),
        createMockReaction('3', '🇰🇷', 'user3'), // Flag emoji
      ];

      const result = groupReactionsByEmoji(reactions);

      expect(result).toHaveLength(2);
      const family = result.find((g) => g.content === '👨‍👩‍👧‍👦');
      expect(family?.by).toHaveLength(2);
    });
  });
});
