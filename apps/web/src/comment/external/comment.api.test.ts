import { describe, expect, it } from 'vitest';

import { mapToComment } from './comment.api';

describe('댓글 로우를 도메인 모델로 매핑할 때', () => {
  it('값이 다 있으면 저자 프로필까지 채운다', () => {
    const comment = mapToComment({
      id: 'c1',
      content: '좋은 글이에요',
      user_id: 'u1',
      user_name: '작성자',
      user_profile_image: 'https://img/snap.png',
      created_at: '2026-01-01T00:00:00.000Z',
      content_json: null,
      author: { nickname: '단짝', profile_photo_url: 'https://img/live.png' },
    });

    expect(comment).toMatchObject({
      id: 'c1',
      content: '좋은 글이에요',
      userId: 'u1',
      userName: '작성자',
      userProfileImage: 'https://img/snap.png',
      author: { nickname: '단짝', profilePhotoURL: 'https://img/live.png' },
    });
    expect(comment.createdAt.toDate().toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('저자 임베드가 없으면 author를 비워 둔다', () => {
    const comment = mapToComment({
      id: 'c1',
      content: '내용',
      user_id: 'u1',
      user_name: '작성자',
      user_profile_image: 'https://img/snap.png',
      created_at: '2026-01-01T00:00:00.000Z',
      content_json: null,
      author: null,
    });

    expect(comment.author).toBeUndefined();
  });

  it('스냅샷 프로필 이미지가 널이면 빈 문자열로 바꾼다', () => {
    const comment = mapToComment({
      id: 'c1',
      content: '내용',
      user_id: 'u1',
      user_name: '작성자',
      user_profile_image: null,
      created_at: '2026-01-01T00:00:00.000Z',
      content_json: null,
      author: null,
    });

    expect(comment.userProfileImage).toBe('');
  });

  it('content_json이 있으면 도메인 contentJson으로 파싱한다', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'mention', attrs: { id: 'u2', label: '단짝' } }],
        },
      ],
    };
    const comment = mapToComment({
      id: 'c1',
      content: '@단짝',
      user_id: 'u1',
      user_name: '작성자',
      user_profile_image: 'https://img/snap.png',
      created_at: '2026-01-01T00:00:00.000Z',
      content_json: doc,
      author: null,
    });

    expect(comment.contentJson).toEqual(doc);
  });

  it('레거시 댓글(content_json 널)은 contentJson을 비워 둔다', () => {
    const comment = mapToComment({
      id: 'c1',
      content: '옛날 댓글',
      user_id: 'u1',
      user_name: '작성자',
      user_profile_image: 'https://img/snap.png',
      created_at: '2026-01-01T00:00:00.000Z',
      content_json: null,
      author: null,
    });

    expect(comment.contentJson).toBeUndefined();
  });
});
