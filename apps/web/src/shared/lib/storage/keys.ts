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

export const SESSION_KEYS = {
  RETURN_TO: 'returnTo',
  PENDING_VERIFICATION_EMAIL: 'pendingVerificationEmail',
} as const;

export function boardTitleKey(boardId: string): string {
  return `boardTitle_${boardId}`;
}

export function scrollPositionKey(routeKey: string): string {
  return `scrollPosition-${routeKey}`;
}

export function userPostSearchKey(userId: string): string {
  return `userPostSearch:${userId}`;
}
