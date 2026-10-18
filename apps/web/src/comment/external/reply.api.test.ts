import { describe, expect, it } from 'vitest';

import { mapToReply } from './reply.api';

describe('답글 로우를 도메인 모델로 매핑할 때', () => {
  it('값이 다 있으면 저자 프로필까지 채운다', () => {
    const reply = mapToReply({
      id: 'r1',
      content: '동의해요',
      user_id: 'u2',
      user_name: '답글쓴이',
      user_profile_image: 'https://img/snap.png',
      created_at: '2026-02-02T00:00:00.000Z',
      content_json: null,
      author: { nickname: '이웃', profile_photo_url: 'https://img/live.png' },
    });

    expect(reply).toMatchObject({
      id: 'r1',
      content: '동의해요',
      userId: 'u2',
      userName: '답글쓴이',
      userProfileImage: 'https://img/snap.png',
      author: { nickname: '이웃', profilePhotoURL: 'https://img/live.png' },
    });
    expect(reply.createdAt.toDate().toISOString()).toBe('2026-02-02T00:00:00.000Z');
  });

  it('저자 임베드가 없으면 author를 비우고, 널 스냅샷 이미지는 빈 문자열로 바꾼다', () => {
    const reply = mapToReply({
      id: 'r1',
      content: '내용',
      user_id: 'u2',
      user_name: '답글쓴이',
      user_profile_image: null,
      created_at: '2026-02-02T00:00:00.000Z',
      content_json: null,
      author: null,
    });

    expect(reply.author).toBeUndefined();
    expect(reply.userProfileImage).toBe('');
  });

  it('content_json이 있으면 도메인 contentJson으로 파싱한다', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'mention', attrs: { id: 'u1', label: '단짝' } }],
        },
      ],
    };
    const reply = mapToReply({
      id: 'r1',
      content: '@단짝',
      user_id: 'u2',
      user_name: '답글쓴이',
      user_profile_image: 'https://img/snap.png',
      created_at: '2026-02-02T00:00:00.000Z',
      content_json: doc,
      author: null,
    });

    expect(reply.contentJson).toEqual(doc);
  });

  it('레거시 답글(content_json 널)은 contentJson을 비워 둔다', () => {
    const reply = mapToReply({
      id: 'r1',
      content: '옛날 답글',
      user_id: 'u2',
      user_name: '답글쓴이',
      user_profile_image: 'https://img/snap.png',
      created_at: '2026-02-02T00:00:00.000Z',
      content_json: null,
      author: null,
    });

    expect(reply.contentJson).toBeUndefined();
  });
});
