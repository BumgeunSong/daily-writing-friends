import { useEffect } from 'react';
import { SESSION_KEYS, sessionStore } from '@/shared/lib/storage';

/**
 * 지금 보고 있는 게시판을 이번 세션 동안 기억한다. 홈 탭은 `/boards`로 가고 그 화면이
 * 이 값을 가장 먼저 보므로, 다른 탭에 갔다 와도 읽던 게시판으로 되돌아온다.
 *
 * 세션이 끝나면 값도 사라진다. 그래서 앱을 새로 열 때는 종료된 기수를 걸러내는 판정이
 * 그대로 동작한다.
 *
 * 라우트 로더가 읽기 권한을 확인한 뒤에야 이 화면이 그려진다. 즉 여기 적히는 게시판은
 * 사용자가 실제로 볼 수 있는 게시판이다. 권한 없는 게시판이 적히면 홈 탭이 매번 권한
 * 오류 화면으로 되돌아가는 고리가 만들어진다.
 */
export function useRecordViewingBoard(boardId: string | undefined): void {
  useEffect(() => {
    if (boardId) sessionStore.set(SESSION_KEYS.VIEWING_BOARD_ID, boardId);
  }, [boardId]);
}
