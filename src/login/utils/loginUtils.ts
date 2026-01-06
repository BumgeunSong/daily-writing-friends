import { Board } from "@/board/model/Board";

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

/**
 * 사용자 활성 상태에 따른 리다이렉트 경로를 결정합니다.
 * @param isActiveUser 사용자가 활성 상태인지 여부
 * @returns 리다이렉트할 경로
 */
export function getLoginRedirectPath(isActiveUser: boolean): string {
    return isActiveUser ? '/boards' : '/join/form';
}
