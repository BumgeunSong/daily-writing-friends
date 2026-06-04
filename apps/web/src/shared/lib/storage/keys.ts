export const STORAGE_KEYS = {
  CURRENT_USER: 'currentUser',
  BOARD_ID: 'boardId',
  THEME_PREFERENCE: 'theme-preference-v2',
} as const;

export const LEGACY_THEME_KEYS = [
  'theme-preference',
  'theme',
  'color-scheme',
] as const;

export function boardTitleKey(boardId: string): string {
  return `boardTitle_${boardId}`;
}
