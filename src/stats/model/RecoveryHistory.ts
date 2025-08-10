/**
 * Recovery history record
 * 실제 파이어스토어 스키마는 날짜를 문자열(YYYY-MM-DD)로 저장합니다.
 * Path: users/{userId}/streakInfo/current/recoveryHistory/{recoveryId}
 */
export interface RecoveryHistory {
  /** 글을 놓친 날짜 (YYYY-MM-DD) */
  missedDate: string;
  /** 복구 완료된 날짜 (YYYY-MM-DD) */
  recoveryDate: string;
  /** 복구에 필요한 글 수 */
  postsRequired: number;
  /** 실제로 작성한 글 수 */
  postsWritten: number;
  /** 복구 레코드 식별자 */
  recoveryId: string;
  /** 복구 성공 여부 */
  successful: boolean;
}
