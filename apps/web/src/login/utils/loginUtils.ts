import type { Board } from "@/board/model/Board";

// ============================================================================
// 날짜 및 캐시 유틸리티
// ============================================================================

/**
 * 연도-월 문자열을 반환합니다.
 * @param date 날짜 객체 (기본값: 현재 날짜)
 * @returns 'YYYY-MM' 형식의 문자열 (예: '2026-01')
 */
export function formatYearMonth(date: Date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 보드 캐시 키를 생성합니다.
 * @param boardId 보드 ID (null일 수 있음)
 * @param yearMonth 연도-월 문자열
 * @returns 캐시 키 또는 null
 */
export function createBoardCacheKey(boardId: string | null, yearMonth: string): string | null {
    return boardId ? `upcomingBoard-${boardId}-${yearMonth}` : null;
}

/**
 * 보드 응답 데이터에 ID를 추가하여 변환합니다.
 * @param board 원본 보드 데이터 (null일 수 있음)
 * @param boardId 보드 ID
 * @returns ID가 포함된 보드 객체 또는 null
 */
export function transformBoardWithId(
    board: Omit<Board, 'id'> | null,
    boardId: string
): Board | null {
    return board ? { ...board, id: boardId } : null;
}

/**
 * 사용자가 활성 사용자 목록에 포함되어 있는지 확인합니다.
 * @param users 사용자 목록
 * @param userId 확인할 사용자 ID
 * @returns 사용자가 목록에 포함되어 있으면 true
 */
export function isUserInActiveList(
    users: Array<{ uid: string }> | undefined,
    userId: string | undefined
): boolean {
    if (!users || !userId) {
        return false;
    }
    return users.some((user) => user.uid === userId);
}

// ============================================================================
// 폼 제출 검증 유틸리티
// ============================================================================

export type SubmitValidationResult =
    | { isValid: true }
    | { isValid: false; error: Error };

/**
 * 폼 제출을 위한 필수 파라미터를 검증합니다.
 * @param boardId 보드 ID
 * @param userId 사용자 ID
 * @returns 검증 결과
 */
export function validateSubmitParams(
    boardId: string | undefined,
    userId: string | undefined
): SubmitValidationResult {
    if (!boardId) {
        return { isValid: false, error: new Error("신청 가능한 기수 정보를 찾을 수 없습니다.") };
    }
    if (!userId) {
        return { isValid: false, error: new Error("사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.") };
    }
    return { isValid: true };
}

/**
 * 성공 응답 객체를 생성합니다.
 * @param name 사용자 이름
 * @param cohort 기수 번호
 * @returns 성공 응답 객체
 */
export function createSuccessResult(name: string | undefined, cohort: number | undefined): {
    success: true;
    name: string;
    cohort: number;
} {
    return {
        success: true,
        name: name ?? "",
        cohort: cohort ?? 0
    };
}

/**
 * 에러를 표준 에러 응답 객체로 래핑합니다.
 * @param error 원본 에러
 * @returns 에러 응답 객체
 */
export function wrapError(error: unknown): { success: false; error: Error } {
    return {
        success: false,
        error: error instanceof Error ? error : new Error("알 수 없는 오류가 발생했습니다.")
    };
}
