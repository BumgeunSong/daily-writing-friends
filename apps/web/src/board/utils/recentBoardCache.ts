import { z } from 'zod';
import type { Board } from '@/board/model/Board';
import { parseJson } from '@/shared/lib/parseJson';

/**
 * 마지막으로 고른 게시판을 그 게시판의 종료 시각과 함께 기억한다. 종료 시각을 같이
 * 적어두기 때문에 재방문 판정이 네트워크 없이 로컬 비교로 끝난다.
 *
 * `expiresAt`은 `boards.last_day`를 그대로 옮긴 값이며 항상 UTC ISO 문자열이다.
 * 하루의 끝으로 보정하지 않는다. 원본이 이미 하루의 끝이고, 초기 기수들은 다음날
 * 00:00 규약이라 보정하면 24시간이 늘어난다.
 */
const RecentBoardCacheSchema = z.object({
  boardId: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export interface RecentBoardRedirect {
  to: string;
  clearStoredCache: boolean;
}

/**
 * `/boards`가 참고하는 두 갈래의 기억.
 *
 * 이 경로는 서로 다른 두 질문에 답한다. 앱을 새로 열었을 때는 어느 기수로 시작할지
 * 정해야 하므로 종료된 기수를 걸러야 하고, 알림 탭에 갔다가 홈 탭으로 돌아왔을 때는
 * 보던 자리로 돌려놓기만 하면 된다. 후자에까지 만료를 적용하면 종료된 기수를 읽던
 * 사용자가 탭을 옮길 때마다 게시판 목록으로 튕긴다.
 */
export interface RecentBoardMemory {
  /** 이번 세션에 열어본 게시판. 세션과 함께 사라지므로 만료를 따지지 않는다. */
  viewingBoardId: string | null;
  /** 세션을 넘어 남는 최근 게시판 기록. 만료 판정 대상이다. */
  storedCache: string | null;
}

const BOARD_LIST_PATH = '/boards/list';

export function resolveRecentBoardRedirect(
  memory: RecentBoardMemory,
  now: Date,
): RecentBoardRedirect {
  // 저장된 기록은 손대지 않는다. 앱을 다시 열면 기수 롤오버 판정이 그대로 돌아야 한다.
  if (memory.viewingBoardId) {
    return { to: `/board/${memory.viewingBoardId}`, clearStoredCache: false };
  }

  if (memory.storedCache === null) return { to: BOARD_LIST_PATH, clearStoredCache: false };

  // 파싱 실패는 만료와 같게 다룬다. 이 변경 이전에 저장된 평문 게시판 id도 여기로
  // 떨어지므로, 배포만으로 지난 기수에 묶여 있던 사용자가 풀려난다.
  const cache = parseJson(memory.storedCache, RecentBoardCacheSchema);
  if (!cache) return { to: BOARD_LIST_PATH, clearStoredCache: true };

  const expiresAt = new Date(cache.expiresAt);
  if (now.getTime() > expiresAt.getTime()) return { to: BOARD_LIST_PATH, clearStoredCache: true };

  return { to: `/board/${cache.boardId}`, clearStoredCache: false };
}

/**
 * 종료일이 없는 게시판은 만료를 판정할 수 없으므로 캐시하지 않는다.
 *
 * `satisfies`로 쓰기 모양을 읽기 스키마에 묶는다. 이게 없으면 스키마 키를 개명해도
 * 컴파일은 통과하고, 모든 쓰기가 파싱 불가가 되어 사용자가 늘 게시판 목록으로 튕긴다.
 */
export function serializeRecentBoard(board: Pick<Board, 'id' | 'lastDay'>): string | null {
  if (!board.lastDay) return null;
  return JSON.stringify({
    boardId: board.id,
    expiresAt: board.lastDay.toDate().toISOString(),
  } satisfies z.infer<typeof RecentBoardCacheSchema>);
}
