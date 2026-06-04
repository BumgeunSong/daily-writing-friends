import { describe, it, expect } from 'vitest';
import { isPostSubmitInputValid } from '../usePostSubmit';

const VALID = {
  title: 'My title',
  content: 'My content',
  boardId: 'b1',
  userId: 'u1',
};

describe('isPostSubmitInputValid', () => {
  it('returns true when title, content, boardId, and userId are all present', () => {
    expect(isPostSubmitInputValid(VALID)).toBe(true);
  });

  describe('content guards', () => {
    it('returns false when title is empty', () => {
      expect(isPostSubmitInputValid({ ...VALID, title: '' })).toBe(false);
    });

    it('returns false when title is whitespace only', () => {
      expect(isPostSubmitInputValid({ ...VALID, title: '   ' })).toBe(false);
    });

    it('returns false when content is empty', () => {
      expect(isPostSubmitInputValid({ ...VALID, content: '' })).toBe(false);
    });

    it('returns false when content is whitespace only', () => {
      expect(isPostSubmitInputValid({ ...VALID, content: '\n\t  ' })).toBe(false);
    });
  });

  describe('identity guards', () => {
    it('returns false when boardId is undefined', () => {
      expect(isPostSubmitInputValid({ ...VALID, boardId: undefined })).toBe(false);
    });

    it('returns false when boardId is an empty string', () => {
      expect(isPostSubmitInputValid({ ...VALID, boardId: '' })).toBe(false);
    });

    it('returns false when userId is undefined', () => {
      expect(isPostSubmitInputValid({ ...VALID, userId: undefined })).toBe(false);
    });

    it('returns false when userId is an empty string', () => {
      expect(isPostSubmitInputValid({ ...VALID, userId: '' })).toBe(false);
    });
  });
});
