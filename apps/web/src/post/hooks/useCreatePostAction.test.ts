import { describe, it, expect } from 'vitest';
import {
  validateCreatePostFormData,
  mapCreatePostErrorMessage,
} from './useCreatePostAction';

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const VALID_ENTRIES = {
  title: 'My title',
  content: 'My content',
  authorId: 'user-1',
  authorName: 'Daisy',
};

describe('validateCreatePostFormData', () => {
  describe('happy path', () => {
    it('returns the trimmed input when all fields are present', () => {
      const fd = makeFormData({ ...VALID_ENTRIES, title: '  hello  ', content: '  body  ' });
      const result = validateCreatePostFormData(fd, 'board-1');
      expect(result).toEqual({
        valid: true,
        input: {
          title: 'hello',
          content: 'body',
          authorId: 'user-1',
          authorName: 'Daisy',
          boardId: 'board-1',
        },
      });
    });
  });

  describe('validation error ordering (each branch returns first failure only)', () => {
    it('reports missing title first', () => {
      const fd = makeFormData({ ...VALID_ENTRIES, title: '   ' });
      expect(validateCreatePostFormData(fd, 'board-1')).toEqual({
        valid: false,
        error: '제목을 입력해주세요.',
      });
    });

    it('reports missing content when title is present', () => {
      const fd = makeFormData({ ...VALID_ENTRIES, content: '' });
      expect(validateCreatePostFormData(fd, 'board-1')).toEqual({
        valid: false,
        error: '내용을 입력해주세요.',
      });
    });

    it('reports missing boardId after title and content pass', () => {
      const fd = makeFormData(VALID_ENTRIES);
      expect(validateCreatePostFormData(fd, undefined)).toEqual({
        valid: false,
        error: '게시판 ID가 누락되었습니다.',
      });
    });

    it('reports missing authorId after the above pass', () => {
      const fd = makeFormData({ ...VALID_ENTRIES, authorId: '' });
      expect(validateCreatePostFormData(fd, 'board-1')).toEqual({
        valid: false,
        error: '사용자 인증이 필요합니다.',
      });
    });

    it('reports missing authorName last', () => {
      const fd = makeFormData({ ...VALID_ENTRIES, authorName: '' });
      expect(validateCreatePostFormData(fd, 'board-1')).toEqual({
        valid: false,
        error: '사용자 이름이 누락되었습니다.',
      });
    });
  });

  describe('whitespace handling', () => {
    it('treats whitespace-only title as empty', () => {
      const fd = makeFormData({ ...VALID_ENTRIES, title: '\t\n  ' });
      expect(validateCreatePostFormData(fd, 'board-1').valid).toBe(false);
    });

    it('treats whitespace-only content as empty', () => {
      const fd = makeFormData({ ...VALID_ENTRIES, content: '   ' });
      expect(validateCreatePostFormData(fd, 'board-1').valid).toBe(false);
    });
  });
});

describe('mapCreatePostErrorMessage', () => {
  it('maps permission-denied to the relogin message', () => {
    expect(mapCreatePostErrorMessage(new Error('Firebase: permission-denied'))).toBe(
      '권한이 없습니다. 다시 로그인해주세요.',
    );
  });

  it('maps network errors to the connection message', () => {
    expect(mapCreatePostErrorMessage(new Error('network request failed'))).toBe(
      '네트워크 연결을 확인해주세요.',
    );
  });

  it('maps quota-exceeded to the storage message', () => {
    expect(mapCreatePostErrorMessage(new Error('quota-exceeded'))).toBe(
      '저장 공간이 부족합니다.',
    );
  });

  it('falls back to the generic message for unrecognized Error messages', () => {
    expect(mapCreatePostErrorMessage(new Error('something else'))).toBe(
      '게시물 작성 중 오류가 발생했습니다. 다시 시도해주세요.',
    );
  });

  it('falls back to the generic message when the thrown value is not an Error', () => {
    expect(mapCreatePostErrorMessage('plain string')).toBe(
      '게시물 작성 중 오류가 발생했습니다. 다시 시도해주세요.',
    );
    expect(mapCreatePostErrorMessage(null)).toBe(
      '게시물 작성 중 오류가 발생했습니다. 다시 시도해주세요.',
    );
  });

  it('matches the first recognized pattern (order: permission → network → quota)', () => {
    // both "permission-denied" and "network" present → permission wins
    expect(
      mapCreatePostErrorMessage(new Error('permission-denied network problem')),
    ).toBe('권한이 없습니다. 다시 로그인해주세요.');
  });
});
