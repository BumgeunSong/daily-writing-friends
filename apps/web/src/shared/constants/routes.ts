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
  /** 통합 온보딩 페이지 (프로필 + 기수 신청) */
  ONBOARDING: '/join/onboarding',
  /** 신청 완료 페이지 */
  JOIN_COMPLETE: '/join/complete',
  /** 통합 로그인 페이지 (Google + 이메일) */
  LOGIN: '/login',
  /** 이메일 회원가입 페이지 */
  SIGNUP: '/signup',
  /** 이메일 인증 대기 페이지 */
  VERIFY_EMAIL: '/verify-email',
  /** 비밀번호 재설정 요청 페이지 */
  FORGOT_PASSWORD: '/forgot-password',
  /** 비밀번호 재설정 확정 페이지 (recovery 세션) */
  SET_PASSWORD: '/set-password',
  /** 사용자 설정 메인 페이지 */
  USER_SETTINGS: '/user/settings',
  /** 설정 - 로그인 수단 추가 페이지 (이메일/비밀번호 추가) */
  ADD_LOGIN_METHOD: '/settings/add-login-method',
  /** 설정 - 비밀번호 변경 페이지 */
  CHANGE_PASSWORD: '/settings/change-password',
} as const;
