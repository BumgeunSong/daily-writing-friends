import { describe, it, expect } from 'vitest';
import { matchesKoreanQuery } from './koreanSearch';

describe('완성된 한글 검색어일 때', () => {
  it('대상에 포함된 부분 문자열이면 일치한다', () => {
    expect(matchesKoreanQuery('글머리 목록', '목록')).toBe(true);
  });

  it('포함되지 않으면 일치하지 않는다', () => {
    expect(matchesKoreanQuery('인용', '제목')).toBe(false);
  });

  it('영문은 대소문자를 구분하지 않는다', () => {
    expect(matchesKoreanQuery('Heading', 'HEAD')).toBe(true);
  });

  it('빈 검색어는 모든 대상과 일치한다', () => {
    expect(matchesKoreanQuery('인용', '')).toBe(true);
  });
});

describe('IME 조합 중인 미완성 음절이 검색어 끝에 있을 때', () => {
  it('받침 없이 모음까지만 조합된 음절도 다음 음절의 일부로 일치한다', () => {
    expect(matchesKoreanQuery('제목', '제모')).toBe(true);
  });

  it('받침 자리에 들어간 자음(젬)은 다음 음절의 초성으로 보고 일치한다', () => {
    expect(matchesKoreanQuery('제목', '젬')).toBe(true);
  });

  it('조합 중인 자음 하나(ㅈ)만 있어도 초성이 같은 대상과 일치한다', () => {
    expect(matchesKoreanQuery('제목', 'ㅈ')).toBe(true);
  });

  it('겹받침이 아닌 받침 후보라도 대상의 자음과 다르면 일치하지 않는다', () => {
    expect(matchesKoreanQuery('제목', '젠')).toBe(false);
  });

  it('조합이 끝난 받침 음절(목)은 그대로 일치한다', () => {
    expect(matchesKoreanQuery('제목', '목')).toBe(true);
  });
});
