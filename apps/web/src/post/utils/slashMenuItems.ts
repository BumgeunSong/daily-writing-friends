import { matchesKoreanQuery } from './koreanSearch';

export type SlashMenuItemId =
  | 'image'
  | 'heading1'
  | 'heading2'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'divider';

export interface SlashMenuItem {
  id: SlashMenuItemId;
  title: string;
  /** 이름 외에 검색에 걸리는 한글/영문 별칭. */
  keywords: string[];
}

export const SLASH_MENU_ITEMS: readonly SlashMenuItem[] = [
  { id: 'image', title: '이미지', keywords: ['image', 'img', 'photo', '사진'] },
  { id: 'heading1', title: '제목 1', keywords: ['heading', 'heading1', 'h1', 'title', '큰제목'] },
  { id: 'heading2', title: '제목 2', keywords: ['heading', 'heading2', 'h2', 'subtitle', '소제목'] },
  { id: 'quote', title: '인용', keywords: ['quote', 'blockquote', '인용구'] },
  { id: 'bulletList', title: '글머리 목록', keywords: ['bullet', 'list', 'ul', '리스트'] },
  { id: 'orderedList', title: '번호 목록', keywords: ['number', 'numbered', 'ordered', 'list', 'ol', '리스트'] },
  { id: 'divider', title: '구분선', keywords: ['divider', 'hr', 'line', 'rule', '가로선'] },
];

const stripSpaces = (text: string) => text.replace(/\s+/g, '');

/** 슬래시 뒤에 입력한 검색어로 항목을 거른다. 이름과 별칭 모두 대상이다. */
export function filterSlashMenuItems(query: string): SlashMenuItem[] {
  const normalizedQuery = stripSpaces(query);
  return SLASH_MENU_ITEMS.filter((item) =>
    [item.title, ...item.keywords].some((candidate) =>
      matchesKoreanQuery(stripSpaces(candidate), normalizedQuery),
    ),
  );
}

interface SlashTriggerInput {
  parentTypeName: string;
  /** 커서가 있는 블록의 전체 텍스트. */
  parentText: string;
  /** 슬래시부터 커서까지의 텍스트(`/제목`). */
  triggerText: string;
}

/** 빈 문단에 슬래시와 검색어만 있을 때만 메뉴를 연다. */
export function isSlashTriggerAllowed({
  parentTypeName,
  parentText,
  triggerText,
}: SlashTriggerInput): boolean {
  return parentTypeName === 'paragraph' && parentText === triggerText;
}
