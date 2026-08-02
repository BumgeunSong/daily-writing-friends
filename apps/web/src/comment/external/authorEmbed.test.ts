import { describe, expect, it } from 'vitest';

import { mapToAuthor } from './authorEmbed';

describe('조인된 author 임베드를 도메인 저자로 매핑할 때', () => {
  it('임베드가 객체 하나면 도메인 저자로 만든다', () => {
    expect(mapToAuthor({ nickname: '단짝', profile_photo_url: 'https://img/1.png' })).toEqual({
      nickname: '단짝',
      profilePhotoURL: 'https://img/1.png',
    });
  });

  it('임베드가 배열로 오면 첫 원소를 쓴다', () => {
    expect(mapToAuthor([{ nickname: '단짝', profile_photo_url: 'https://img/1.png' }])).toEqual({
      nickname: '단짝',
      profilePhotoURL: 'https://img/1.png',
    });
  });

  it('닉네임과 사진이 널이어도 널 그대로 담는다', () => {
    expect(mapToAuthor({ nickname: null, profile_photo_url: null })).toEqual({
      nickname: null,
      profilePhotoURL: null,
    });
  });

  it('저자가 없으면(null·undefined·빈 배열) undefined를 반환한다', () => {
    expect(mapToAuthor(null)).toBeUndefined();
    expect(mapToAuthor(undefined)).toBeUndefined();
    expect(mapToAuthor([])).toBeUndefined();
  });
});
