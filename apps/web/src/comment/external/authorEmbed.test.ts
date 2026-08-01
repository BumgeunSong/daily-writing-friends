import { describe, expect, it } from 'vitest';

import { mapToAuthor } from './authorEmbed';

describe('조인된 author 임베드를 도메인 저자로 매핑할 때', () => {
  it('단일 객체 임베드를 도메인 저자로 옮긴다', () => {
    expect(mapToAuthor({ nickname: '단짝', profile_photo_url: 'https://img/1.png' })).toEqual({
      nickname: '단짝',
      profilePhotoURL: 'https://img/1.png',
    });
  });

  it('한 원소 배열로 온 임베드는 첫 원소를 사용한다', () => {
    expect(mapToAuthor([{ nickname: '단짝', profile_photo_url: 'https://img/1.png' }])).toEqual({
      nickname: '단짝',
      profilePhotoURL: 'https://img/1.png',
    });
  });

  it('닉네임과 사진이 널이어도 그대로 널로 옮긴다', () => {
    expect(mapToAuthor({ nickname: null, profile_photo_url: null })).toEqual({
      nickname: null,
      profilePhotoURL: null,
    });
  });

  it('저자가 없으면(null/undefined/빈 배열) undefined를 반환한다', () => {
    expect(mapToAuthor(null)).toBeUndefined();
    expect(mapToAuthor(undefined)).toBeUndefined();
    expect(mapToAuthor([])).toBeUndefined();
  });
});
