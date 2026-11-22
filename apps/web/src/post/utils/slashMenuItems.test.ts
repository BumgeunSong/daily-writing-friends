import { describe, it, expect } from 'vitest';
import { SLASH_MENU_ITEMS, filterSlashMenuItems, isSlashTriggerAllowed } from './slashMenuItems';

const ids = (query: string) => filterSlashMenuItems(query).map((item) => item.id);

describe('슬래시 메뉴 항목 정의', () => {
  it('이미지, 제목 1, 제목 2, 인용, 글머리 목록, 번호 목록, 구분선 7개를 이 순서로 제공한다', () => {
    expect(SLASH_MENU_ITEMS.map((item) => item.title)).toEqual([
      '이미지',
      '제목 1',
      '제목 2',
      '인용',
      '글머리 목록',
      '번호 목록',
      '구분선',
    ]);
  });
});

describe('슬래시 뒤 검색어로 항목을 거를 때', () => {
  it('검색어가 비어 있으면 7개 모두 보인다', () => {
    expect(ids('')).toHaveLength(7);
  });

  it('한글 이름(제목)으로 제목 1, 제목 2가 걸린다', () => {
    expect(ids('제목')).toEqual(['heading1', 'heading2']);
  });

  it('한글 이름(인용)으로 인용만 걸린다', () => {
    expect(ids('인용')).toEqual(['quote']);
  });

  it.each([
    ['heading', ['heading1', 'heading2']],
    ['quote', ['quote']],
    ['image', ['image']],
    ['divider', ['divider']],
    ['bullet', ['bulletList']],
    ['number', ['orderedList']],
  ])('영문 키워드 %s로도 걸린다', (query, expected) => {
    expect(ids(query)).toEqual(expected);
  });

  it('영문 키워드는 대소문자를 구분하지 않는다', () => {
    expect(ids('HEADING')).toEqual(['heading1', 'heading2']);
  });

  it('이름의 띄어쓰기와 상관없이 숫자까지 입력하면 하나로 좁혀진다', () => {
    expect(ids('제목1')).toEqual(['heading1']);
  });

  it.each([
    ['사진', 'image'],
    ['h1', 'heading1'],
    ['큰제목', 'heading1'],
    ['소제목', 'heading2'],
    ['blockquote', 'quote'],
    ['ul', 'bulletList'],
    ['ol', 'orderedList'],
    ['hr', 'divider'],
    ['가로선', 'divider'],
  ])('별칭 %s는 %s 항목을 포함해 걸린다', (query, expectedId) => {
    expect(ids(query)).toContain(expectedId);
  });

  it('일치하는 항목이 없으면 빈 목록이다', () => {
    expect(ids('없는항목')).toEqual([]);
  });

  it('IME 조합 중인 미완성 음절(제모)도 제목으로 걸린다', () => {
    expect(ids('제모')).toEqual(['heading1', 'heading2']);
  });

  it('IME 조합 중 초성만 입력된 상태(구ㅂ)도 구분선으로 걸린다', () => {
    expect(ids('구ㅂ')).toEqual(['divider']);
  });
});

describe('슬래시 메뉴를 열 수 있는 자리를 판단할 때', () => {
  it('문단에 슬래시와 검색어만 있으면 열 수 있다', () => {
    expect(isSlashTriggerAllowed({ parentTypeName: 'paragraph', parentDepth: 1, parentText: '/제목', triggerText: '/제목' })).toBe(true);
  });

  it('문장 중간의 슬래시(날짜, URL)에서는 열 수 없다', () => {
    expect(isSlashTriggerAllowed({ parentTypeName: 'paragraph', parentDepth: 1, parentText: '2026/11', triggerText: '/11' })).toBe(false);
  });

  it('문단에 앞뒤 글이 있으면 빈 줄이 아니므로 열 수 없다', () => {
    expect(isSlashTriggerAllowed({ parentTypeName: 'paragraph', parentDepth: 1, parentText: '/ 안녕', triggerText: '/' })).toBe(false);
  });

  it('인용이나 목록 안의 문단에서는 열 수 없다', () => {
    expect(isSlashTriggerAllowed({ parentTypeName: 'paragraph', parentDepth: 3, parentText: '/', triggerText: '/' })).toBe(false);
  });

  it('제목 같은 문단이 아닌 블록에서는 열 수 없다', () => {
    expect(isSlashTriggerAllowed({ parentTypeName: 'heading', parentDepth: 1, parentText: '/', triggerText: '/' })).toBe(false);
  });
});
