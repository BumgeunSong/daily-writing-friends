import { describe, it, expect, vi } from 'vitest';

// Mock Firebase modules before importing draftUtils
vi.mock('@/firebase', () => ({
  firestore: {},
}));

vi.mock('@/shared/api/trackedFirebase', () => ({
  trackedFirebase: {
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
  },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: (date: Date) => ({
      toDate: () => date,
    }),
  },
}));

import { formatDraftDate, getDraftTitle, getDraftPreview } from './draftUtils';
import type { Draft } from '@/draft/model/Draft';

// Create a mock timestamp object
function createMockTimestamp(date: Date) {
  return {
    toDate: () => date,
  };
}

function createMockDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    boardId: 'board-1',
    title: 'Test Title',
    content: '<p>Test content</p>',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock object for test
    savedAt: createMockTimestamp(new Date('2025-01-15T12:00:00Z')) as any,
    ...overrides,
  };
}

describe('draftUtils', () => {
  describe('formatDraftDate', () => {
    it('should format timestamp to readable date string', () => {
      const timestamp = createMockTimestamp(new Date('2025-01-15T14:30:00'));
      const result = formatDraftDate(timestamp);

      // Should contain year, month, day, hour, minute
      expect(result).toMatch(/2025/);
      expect(result).toMatch(/01/);
      expect(result).toMatch(/15/);
    });

    it('should use user locale formatting', () => {
      const timestamp = createMockTimestamp(new Date('2025-12-25T09:30:00'));
      const result = formatDraftDate(timestamp);

      // The result should be a valid formatted string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getDraftTitle', () => {
    it('should return draft title when it has content', () => {
      const draft = createMockDraft({ title: 'My Draft Title' });
      expect(getDraftTitle(draft)).toBe('My Draft Title');
    });

    it('should return "(제목 없음)" for empty title', () => {
      const draft = createMockDraft({ title: '' });
      expect(getDraftTitle(draft)).toBe('(제목 없음)');
    });

    it('should return "(제목 없음)" for whitespace-only title', () => {
      const draft = createMockDraft({ title: '   ' });
      expect(getDraftTitle(draft)).toBe('(제목 없음)');
    });

    it('should return "(제목 없음)" for tab-only title', () => {
      const draft = createMockDraft({ title: '\t\t' });
      expect(getDraftTitle(draft)).toBe('(제목 없음)');
    });

    it('should preserve title with leading/trailing spaces if has content', () => {
      const draft = createMockDraft({ title: '  Title with spaces  ' });
      expect(getDraftTitle(draft)).toBe('  Title with spaces  ');
    });
  });

  describe('getDraftPreview', () => {
    it('should remove HTML tags and return plain text', () => {
      const draft = createMockDraft({ content: '<p>Hello <strong>World</strong></p>' });
      expect(getDraftPreview(draft)).toBe('Hello World');
    });

    it('should truncate content longer than 50 characters', () => {
      const longContent = 'A'.repeat(100);
      const draft = createMockDraft({ content: `<p>${longContent}</p>` });
      const result = getDraftPreview(draft);

      expect(result).toHaveLength(53); // 50 chars + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not add ellipsis for content exactly 50 characters', () => {
      const exactContent = 'A'.repeat(50);
      const draft = createMockDraft({ content: `<p>${exactContent}</p>` });
      const result = getDraftPreview(draft);

      expect(result).toBe(exactContent);
      expect(result).not.toContain('...');
    });

    it('should not add ellipsis for content less than 50 characters', () => {
      const shortContent = 'Short text';
      const draft = createMockDraft({ content: `<p>${shortContent}</p>` });
      const result = getDraftPreview(draft);

      expect(result).toBe(shortContent);
      expect(result).not.toContain('...');
    });

    it('should return "(내용 없음)" for empty content', () => {
      const draft = createMockDraft({ content: '' });
      expect(getDraftPreview(draft)).toBe('(내용 없음)');
    });

    it('should return "(내용 없음)" for content with only HTML tags', () => {
      const draft = createMockDraft({ content: '<p></p><br/>' });
      expect(getDraftPreview(draft)).toBe('(내용 없음)');
    });

    it('should handle nested HTML tags', () => {
      const draft = createMockDraft({
        content: '<div><p><span>Nested <strong>content</strong></span></p></div>',
      });
      expect(getDraftPreview(draft)).toBe('Nested content');
    });

    it('should handle multiple paragraphs', () => {
      const draft = createMockDraft({
        content: '<p>First paragraph</p><p>Second paragraph</p>',
      });
      expect(getDraftPreview(draft)).toBe('First paragraphSecond paragraph');
    });

    it('should handle list items', () => {
      const draft = createMockDraft({
        content: '<ul><li>Item 1</li><li>Item 2</li></ul>',
      });
      expect(getDraftPreview(draft)).toBe('Item 1Item 2');
    });

    it('should handle special characters in content', () => {
      const draft = createMockDraft({
        content: '<p>&lt;script&gt;alert("XSS")&lt;/script&gt;</p>',
      });
      // Note: The simple regex doesn't decode HTML entities
      const result = getDraftPreview(draft);
      expect(result).toContain('script');
    });
  });
});
