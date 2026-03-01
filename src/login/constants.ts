/**
 * 로그인/가입 기능에서 사용하는 상수 정의
 */

/**
 * Firebase Remote Config 키 상수
 */
export const REMOTE_CONFIG_KEYS = {
  /** 다가오는(신청 가능한) 보드 ID */
  UPCOMING_BOARD_ID: 'upcoming_board_id',
  /** 현재 활성화된 보드 ID */
  ACTIVE_BOARD_ID: 'active_board_id',
} as const;

/**
 * 라우트 경로 상수
 */
export const ROUTES = {
  /** 보드 목록 페이지 */
  BOARDS: '/boards',
  /** 인트로(가입 안내) 페이지 */
  JOIN: '/join',
  /** 가입 폼 페이지 */
  JOIN_FORM: '/join/form',
} as const;

/**
 * 캐시 관련 상수
 */
export const CACHE_CONSTANTS = {
  /** 캐시 stale 시간: 1시간 (밀리초) */
  STALE_TIME: 1000 * 60 * 60,
  /** 캐시 유지 시간: 24시간 (밀리초) */
  CACHE_TIME: 1000 * 60 * 60 * 24,
} as const;

/**
 * UI 관련 상수
 */
export const UI_CONSTANTS = {
  /** 가로 스크롤 이동 거리 (픽셀) */
  SCROLL_AMOUNT: 200,
} as const;
