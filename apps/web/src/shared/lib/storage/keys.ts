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
  /** 이번 세션에 열어본 게시판. 탭을 오갈 때 보던 자리로 돌려놓는 데 쓴다. */
  VIEWING_BOARD_ID: 'viewingBoardId',
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
