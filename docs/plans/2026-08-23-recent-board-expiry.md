# 지난 기수 게시판 리다이렉트 만료 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `/boards` 진입 시 재사용하는 최근 게시판 캐시에 게시판의 `last_day` 기반 만료를 붙여, 기수가 끝난 게시판으로 사용자가 계속 리다이렉트되는 것을 막는다.

**Architecture:** localStorage `boardId`에 문자열 하나만 저장하던 것을 `{ boardId, expiresAt }` JSON으로 바꾼다. `expiresAt`은 게시판의 `last_day`다. 판정은 순수 함수 하나에 모으고(functional core), `RecentBoard`는 그 결과를 렌더링만 한다(imperative shell). 네트워크 호출은 늘어나지 않는다. 쓰기 시점은 게시판 목록 탭 한 곳이며, 그 시점에 `lastDay`가 포함된 board 객체가 이미 로드되어 있다.

**Tech Stack:** React Router v6 data router, zod 3.25, Vitest(unit/integration 두 프로젝트), MSW, TanStack Query v4.

---

## 배경: 이 계획이 근거하는 프로덕션 사실

구현 중 이 전제가 틀렸다고 의심되면 멈추고 확인할 것.

| 사실 | 확인 방법 | 값 |
|---|---|---|
| `boards.last_day`는 하루의 끝에 저장된다 | 프로덕션 `boards` 28행 조회 | cohort 20+ 는 전부 `14:59:59.999Z`(= KST 23:59:59.999). 자기 마지막 날 00:00에 박힌 행은 0개 |
| 규약의 출처 | `apps/admin/src/hooks/useCreateUpcomingBoard.ts:25` | `date.setHours(23, 59, 59, 999)` |
| `last_day`가 null인 게시판 | 프로덕션 조회 | 28개 중 1개(`매일 글쓰기 팁`, cohort 0, 상시 보드) |
| `last_day`는 생성 후 수정되지 않는다 | `apps/admin/src/app/api/admin/boards/**` | PATCH/PUT 라우트 없음. 생성 POST만 존재 |
| 문제의 크기 | 각 기수 `last_day` 이후 해당 게시판 작성 글 | 25기 2명, 26기 1명, 27기 8명, 28기 4명(2일차) |

**중요: 클라이언트에서 하루의 끝으로 정규화하지 않는다.** 데이터가 이미 하루의 끝이고, 11~19기는 다음날 00:00 규약이라 정규화하면 24시간이 늘어난다. `now > expiresAt` 직접 비교만 한다.

---

## Task 1: 순수 판정 함수와 스키마

**Files:**
- Create: `apps/web/src/board/utils/recentBoardCache.ts`
- Test: `apps/web/src/board/utils/recentBoardCache.test.ts`

부수효과 없는 모듈이다. localStorage도 라우터도 여기서 건드리지 않는다. 입력은 문자열과 시각, 출력은 어디로 갈지와 캐시를 지울지다.

**Step 1: 실패하는 테스트를 작성한다**

`apps/web/src/board/utils/recentBoardCache.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Board } from '@/board/model/Board';
import { createTimestamp } from '@/shared/model/Timestamp';
import { resolveRecentBoardRedirect, serializeRecentBoard } from './recentBoardCache';

const NOW = new Date('2026-08-23T00:00:00.000Z');

function cacheValue(boardId: string, expiresAt: string): string {
  return JSON.stringify({ boardId, expiresAt });
}

function boardWith(lastDay: Date | undefined): Board {
  return {
    id: 'board-1',
    title: '매일 글쓰기 프렌즈 29기',
    description: '',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    lastDay: lastDay ? createTimestamp(lastDay) : undefined,
    waitingUsersIds: [],
  };
}

describe('resolveRecentBoardRedirect', () => {
  it('sends a user with no cached board to the board list', () => {
    expect(resolveRecentBoardRedirect(null, NOW))
      .toEqual({ to: '/boards/list', clearCache: false });
  });

  it('clears a legacy bare-id value and sends the user to the board list', () => {
    expect(resolveRecentBoardRedirect('884afdbe-3620-415c-a8db-72d703e8df46', NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('clears a cache whose board has ended', () => {
    const ended = cacheValue('board-28', '2026-08-21T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(ended, NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('redirects to a board that is still running', () => {
    const running = cacheValue('board-29', '2026-09-18T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(running, NOW))
      .toEqual({ to: '/board/board-29', clearCache: false });
  });

  it('treats the last millisecond of the final day as still running', () => {
    const boundary = new Date('2026-08-21T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(cacheValue('b', boundary.toISOString()), boundary))
      .toEqual({ to: '/board/b', clearCache: false });
  });

  it('expires one millisecond after the final day ends', () => {
    const boundary = new Date('2026-08-21T14:59:59.999Z');
    const justAfter = new Date(boundary.getTime() + 1);
    expect(resolveRecentBoardRedirect(cacheValue('b', boundary.toISOString()), justAfter))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('clears a cache with a malformed expiry', () => {
    expect(resolveRecentBoardRedirect(cacheValue('b', 'not-a-date'), NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('clears a cache with an empty board id', () => {
    expect(resolveRecentBoardRedirect(cacheValue('', '2026-09-18T14:59:59.999Z'), NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });
});

describe('serializeRecentBoard', () => {
  it('stores the board id with its last day as the expiry', () => {
    const board = boardWith(new Date('2026-09-18T14:59:59.999Z'));
    expect(serializeRecentBoard(board))
      .toBe(JSON.stringify({ boardId: 'board-1', expiresAt: '2026-09-18T14:59:59.999Z' }));
  });

  it('refuses to cache a board with no end date', () => {
    expect(serializeRecentBoard(boardWith(undefined))).toBeNull();
  });
});
```

**Step 2: 테스트를 돌려 실패를 확인한다**

Run: `pnpm --filter web test:run src/board/utils/recentBoardCache.test.ts`
Expected: FAIL — `Failed to resolve import "./recentBoardCache"`

**Step 3: 최소 구현을 작성한다**

`apps/web/src/board/utils/recentBoardCache.ts`:

```ts
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
  clearCache: boolean;
}

const BOARD_LIST_PATH = '/boards/list';

export function resolveRecentBoardRedirect(raw: string | null, now: Date): RecentBoardRedirect {
  if (raw === null) return { to: BOARD_LIST_PATH, clearCache: false };

  // 파싱 실패는 만료와 같게 다룬다. 이 변경 이전에 저장된 평문 게시판 id도 여기로
  // 떨어지므로, 배포만으로 지난 기수에 묶여 있던 사용자가 풀려난다.
  const cache = parseJson(raw, RecentBoardCacheSchema);
  if (!cache) return { to: BOARD_LIST_PATH, clearCache: true };

  const expiresAt = new Date(cache.expiresAt);
  if (now.getTime() > expiresAt.getTime()) return { to: BOARD_LIST_PATH, clearCache: true };

  return { to: `/board/${cache.boardId}`, clearCache: false };
}

/** 종료일이 없는 게시판은 만료를 판정할 수 없으므로 캐시하지 않는다. */
export function serializeRecentBoard(board: Board): string | null {
  if (!board.lastDay) return null;
  return JSON.stringify({
    boardId: board.id,
    expiresAt: board.lastDay.toDate().toISOString(),
  });
}
```

**Step 4: 테스트를 돌려 통과를 확인한다**

Run: `pnpm --filter web test:run src/board/utils/recentBoardCache.test.ts`
Expected: PASS, 10 tests

**Step 5: 뮤테이션으로 검증한다**

@testing 의 references/verification.md 를 따른다. 최소 두 개는 확인할 것.

1. `now.getTime() > expiresAt.getTime()` 를 `>=` 로 바꾼다 → 경계 테스트(마지막 밀리초) 하나가 빨개져야 한다. 안 빨개지면 경계 테스트가 가짜다.
2. `if (!board.lastDay) return null;` 를 지운다 → `refuses to cache a board with no end date` 가 빨개져야 한다.

되돌린 뒤 다시 초록인지 확인한다.

**Step 6: 커밋한다**

```bash
git add apps/web/src/board/utils/recentBoardCache.ts apps/web/src/board/utils/recentBoardCache.test.ts
git commit -m "feat: 최근 게시판 캐시에 종료일 기반 만료 판정 추가"
```

---

## Task 2: `RecentBoard`를 판정 함수에 연결

**Files:**
- Modify: `apps/web/src/board/components/RecentBoard.tsx` (전체 교체)

**Step 1: 구현을 교체한다**

```tsx
import type React from 'react';
import { Navigate } from '@/shared/navigation';

import { resolveRecentBoardRedirect } from '@/board/utils/recentBoardCache';
import { STORAGE_KEYS, storage } from '@/shared/lib/storage';

const RecentBoard: React.FC = () => {
  const { to, clearCache } = resolveRecentBoardRedirect(
    storage.get(STORAGE_KEYS.BOARD_ID),
    new Date(),
  );

  if (clearCache) storage.remove(STORAGE_KEYS.BOARD_ID);

  return <Navigate to={to} />;
};

export default RecentBoard;
```

렌더 중 `storage.remove`를 부르는 게 걸릴 수 있으나, 이 컴포넌트는 `<Navigate>` 하나만 반환하고 즉시 언마운트되는 리다이렉트 전용 컴포넌트다. 만료된 값을 지우는 것은 멱등이라 StrictMode의 이중 렌더에도 안전하다.

**Step 2: 타입 체크한다**

Run: `pnpm --filter web type-check`
Expected: 에러 없음

**Step 3: 커밋한다**

```bash
git add apps/web/src/board/components/RecentBoard.tsx
git commit -m "refactor: RecentBoard 리다이렉트를 만료 판정 함수에 위임"
```

---

## Task 3: 쓰기 경로를 새 포맷으로 교체

**Files:**
- Modify: `apps/web/src/board/components/BoardListPage.tsx:41-43`, `:72-77`

`handleBoardClick`이 게시판 id만 받던 것을 board 객체를 받도록 바꾼다. 이 컴포넌트는 이미 `lastDay`가 포함된 board 배열을 렌더링 중이라 추가 조회가 없다.

**Step 1: 핸들러를 교체한다**

```tsx
import { serializeRecentBoard } from '@/board/utils/recentBoardCache';
```

```tsx
  const handleBoardClick = (board: Board) => {
    const cached = serializeRecentBoard(board);
    if (cached) {
      storage.set(STORAGE_KEYS.BOARD_ID, cached);
    } else {
      // 종료일 없는 상시 게시판은 기억하지 않는다. 남아 있던 기수 캐시도 함께 버린다.
      storage.remove(STORAGE_KEYS.BOARD_ID);
    }
  };
```

**Step 2: 호출부를 바꾼다**

`:74` 의 `onClick={() => handleBoardClick(board.id)}` 를 `onClick={() => handleBoardClick(board)}` 로 바꾼다.

**Step 3: 남은 평문 쓰기가 없는지 확인한다**

Run: `rg -n "STORAGE_KEYS.BOARD_ID" apps/web/src`
Expected: 네 곳만 남는다.
- `board/utils/recentBoardCache.ts` 는 나오지 않는다(키를 모른다)
- `board/components/RecentBoard.tsx` — 읽기 + 만료 시 삭제
- `board/components/BoardListPage.tsx` — 쓰기
- `shared/components/PermissionErrorBoundary.tsx:62` — 403 시 삭제. 포맷과 무관하므로 수정 불필요
- `shared/lib/storage/keys.test.ts` — 키 이름 단언. 키 이름은 그대로이므로 수정 불필요

평문 문자열을 이 키에 쓰는 곳이 하나라도 더 있으면 그 값은 다음 진입에서 만료로 처리되어 사용자가 목록으로 튕긴다. 반드시 0개여야 한다.

**Step 4: 타입 체크와 린트**

Run: `pnpm --filter web type-check && pnpm --filter web lint`
Expected: 에러 없음

**Step 5: 커밋한다**

```bash
git add apps/web/src/board/components/BoardListPage.tsx
git commit -m "feat: 게시판 선택 시 종료일을 함께 저장"
```

---

## Task 4: 라우터를 통과하는 리다이렉트를 검증

**Files:**
- Create: `apps/web/src/board/components/RecentBoard.test.tsx`

순수 함수 테스트는 판정을 증명하지만, localStorage에서 읽어 라우터가 실제로 이동하는지는 증명하지 못한다. 이 Task가 막는 위험은 그 배선 하나다.

**목적지 페이지는 스텁으로 둔다.** 실제 `BoardListPage`를 띄우면 `user_board_permissions` + `boards!inner` 임베드와 `board_waiting_users` MSW 핸들러를 새로 만들어야 하는데, 게시판 목록이 렌더되는지는 이번 변경의 위험이 아니다. 스텁을 쓰면 네트워크가 0이 되므로 MSW가 필요 없고, 따라서 `.integration` 접미사 없이 unit 프로젝트에 둔다. 이건 의도된 선택이다.

**Step 1: 테스트를 작성한다**

`createMemoryRouter`로 세 경로를 띄운다. `/boards`에만 실제 `RecentBoard`를 걸고, `/boards/list`와 `/board/:boardId`는 자기 이름을 렌더하는 스텁으로 둔다. `initialEntries={['/boards']}`.

검증할 것은 네 가지다.

1. 만료된 캐시 → 게시판 목록 스텁이 보이고, `localStorage.getItem('boardId')`가 `null`이다
2. 이 변경 이전의 평문 id → 게시판 목록 스텁이 보이고, 키가 지워져 있다
3. 유효한 캐시 → 해당 `boardId`를 렌더하는 게시판 스텁이 보이고, 키는 그대로 남아 있다
4. 캐시 없음 → 게시판 목록 스텁이 보인다

단언은 화면에 보이는 것으로 한다. 라우터 내부 상태나 URL 문자열을 들여다보지 말 것.

`beforeEach`에서 `localStorage.clear()` 할 것. 테스트 간 누수가 이 파일에서는 곧바로 거짓 초록이 된다.

**Step 2: 테스트를 돌린다**

Run: `pnpm --filter web test:run src/board/components/RecentBoard.test.tsx`
Expected: PASS, 4 tests

**Step 3: 커밋한다**

```bash
git add apps/web/src/board/components/RecentBoard.test.tsx
git commit -m "test: 만료된 최근 게시판 캐시의 리다이렉트 경로 검증"
```

---

## Task 5: 브라우저로 실제 동작을 확인

@verify-browser 와 @run-web 을 따른다. 타입 체크와 테스트 통과는 리다이렉트가 브라우저에서 동작한다는 증거가 아니다.

**Step 1: 로컬에서 앱을 띄운다**

@run-web 의 실행 방법을 따른다. mise node PATH 프리픽스가 필요하다.

**Step 2: 세 시나리오를 직접 확인한다**

DevTools 콘솔에서 localStorage를 심고 `/boards`로 이동해 도착지를 본다.

```js
// 1. 지난 기수 (28기, 2026-08-21 종료) — 게시판 목록으로 가야 한다
localStorage.setItem('boardId', JSON.stringify({
  boardId: '884afdbe-3620-415c-a8db-72d703e8df46',
  expiresAt: '2026-08-21T14:59:59.999Z',
}));

// 2. 이 변경 이전 포맷 — 게시판 목록으로 가야 한다
localStorage.setItem('boardId', '884afdbe-3620-415c-a8db-72d703e8df46');

// 3. 진행 중 기수 (29기, 2026-09-18 종료) — 해당 게시판으로 가야 한다
localStorage.setItem('boardId', JSON.stringify({
  boardId: '5c807450-51d7-4ff9-9993-e49281baaf9e',
  expiresAt: '2026-09-18T14:59:59.999Z',
}));
```

1번과 2번 이후 `localStorage.getItem('boardId')`가 `null`인지도 확인한다.

**Step 3: 목록에서 게시판을 탭한 뒤 저장된 값을 확인한다**

`{"boardId":"...","expiresAt":"...Z"}` 형태여야 한다. 평문 id가 저장되면 Task 3이 덜 끝난 것이다.

**Step 4: 스크린샷을 남기고 커밋한다**

---

## Task 6: PR

@commit 과 @pr-stacking 을 따른다. PR 본문에 담을 것.

- 지난 기수에 글을 쓴 사용자 수(25기 2명, 26기 1명, 27기 8명, 28기 4명)
- 정규화를 넣지 않은 이유(프로덕션 `last_day`가 이미 하루의 끝이고, 초기 기수는 다음날 00:00 규약이라 정규화 시 24시간 연장)
- 배포 즉시 지난 기수에 묶인 사용자 전원이 게시판 목록을 한 번 보게 된다는 점. 28기 종료(8/21)와 29기 시작(8/24) 사이라 타이밍이 유리하다

---

## Phase 2 (종료된 게시판 배너) — 만들지 않기로 결정 (2026-08-25)

원래 계획은 `BoardPage` 상단에 종료 안내 배너를 띄우고 `WritingActionButton`에서 한 번 확인받는 것이었다. **만들지 않는다.**

"배너가 필요한가"를 직접 묻는 대신 **"배너만이 구할 수 있는 사람이 몇 명인가"**로 바꿔서 프로덕션을 조회했다. 각 기수 `last_day` 이후 그 게시판에 글을 쓴 사람이, 그 시점에 다음 기수 게시판 권한을 갖고 있었는지 세었다. 권한이 있었다면 갈 곳이 있는데 잘못 도착한 것이고, 없었다면 배너 말고는 알릴 방법이 없다.

| 기수 | 종료 후 글 | 작성자 | 다음 기수 권한 있음 | 없음 |
|---|---|---|---|---|
| 25기 | 3 | 2 | 2 | 0 |
| 26기 | 2 | 1 | 1 | 0 |
| 27기 | 8 | 8 | 8 | 0 |
| 28기 | 4 | 4 | 4 | 0 |

최근 네 기수에서 **15명 중 15명이 새 기수 게시판을 이미 갖고 있었다.** 배너가 유일하게 구할 수 있는 사람은 0명이다. 이들은 길을 몰랐던 게 아니라 자동으로 옛 게시판에 떨궈진 것이고, 그건 Phase 1이 고친 경로다. 27기 8건이라는 수치만 보면 배너가 정당해 보이지만 권한 컬럼을 붙이는 순간 뒤집힌다. 집계는 원인을 말해주지 않는다.

**대신 받아들이는 것:** 북마크·알림 딥링크·브라우저 히스토리로 종료된 게시판에 직접 들어가는 경로는 안내가 없다. 세션 기억 도입(#763) 이후로는 그렇게 들어가면 탭을 옮겨도 세션 내내 머문다. 이전에는 탭 이동 시 목록으로 튕기는 게 우연한 힌트였는데 그 신호가 사라졌다. 다만 이 경로들의 실제 빈도를 뒷받침할 데이터가 없어서, 지금 만들면 근거 없이 만드는 것이 된다.

**다시 열어야 할 조건:** 29기(8/24~9/18)는 이 수정이 배포된 채로 30기 전환을 지나간다. 전환 후 같은 쿼리를 다시 돌려서 29기 종료 후 글이 여전히 여러 건이면, 리다이렉트가 전부가 아니었다는 뜻이므로 그때 근거를 갖고 만든다. 0~1건이면 이 결정이 맞았다는 확인이다.

---

## 별도 이슈로 남기는 것 (#766으로 등록)

`apps/admin/src/hooks/useCreateUpcomingBoard.ts:25`의 `setHours(23, 59, 59, 999)`는 관리자 브라우저의 타임존에서 실행된다. KST가 아닌 기기에서 기수를 만들면 그 타임존의 하루 끝이 `last_day`에 박힌다. 지금까지 만들어진 모든 게시판은 KST라 문제가 없었다. 클라이언트에서 보정할 문제가 아니라 admin에서 KST 고정으로 고칠 문제다.
