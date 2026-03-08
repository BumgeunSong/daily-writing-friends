# Admin App: Firestore Reads → Supabase Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch all Firestore reads in the admin app to Supabase, and remove dead features (narration, streak).

**Architecture:** Replace per-page Firestore query functions with a centralized `src/apis/supabase-reads.ts` module. Each page's `useQuery` hooks keep their keys and caching logic, only the `queryFn` changes. Writes remain dual-write for now (follow-up task).

**Tech Stack:** Supabase JS v2 (already installed), TanStack React Query v5 (existing), Next.js 15 App Router.

---

## Task 1: Remove dead features — narration, streak, user-churn

Remove unused features that won't be migrated.

**Delete files:**
- `src/app/admin/narration/page.tsx`
- `src/app/admin/narration/[narrationId]/page.tsx`
- `src/app/admin/user-churn/page.tsx`
- `src/app/admin/streak-monitor/page.tsx`
- `src/app/admin/streak-monitor/[uid]/page.tsx`
- `src/apis/narrations.ts`
- `src/apis/streak-es.ts`
- `src/hooks/useNarrations.ts`
- `src/hooks/useNarration.ts`
- `src/hooks/useNarrationSections.ts`
- `src/hooks/useAudioRecorder.ts`
- `src/components/admin/narration/NarrationEditor.tsx`
- `src/components/admin/narration/SectionList.tsx`
- `src/components/admin/narration/SectionCard.tsx`

**Modify:** `src/app/admin/layout.tsx`
- Remove nav items: `이탈 유저 관리` (`/admin/user-churn`), `내레이션 가이드` (`/admin/narration`), `Streak Monitor` (`/admin/streak-monitor`)
- Remove unused icon imports: `Mic`, `Activity`, `CircleDashed`

**Modify:** `src/types/firestore.ts`
- Remove types: `Narration`, `NarrationSection`, `EventType`, `Event`, `ProjectionPhase2Status`, `OnStreakStatus`, `EligibleStatus`, `MissedStatus`, `ProjectionPhase2`, `EventMeta`, `UserProfile`, `StreakUserRow`, `UserDetailData`, `StreakSnapshot`, `EventChange`, `EventExplanation`, `ExplanationSummary`, `ExplainProjectionResponse`

**Step 1:** Delete the files listed above.

**Step 2:** Edit `src/app/admin/layout.tsx` — remove the 3 nav items and unused icon imports.

**Step 3:** Edit `src/types/firestore.ts` — remove streak/narration types.

**Step 4:** Run `npm run build` to verify no broken imports.

**Step 5:** Commit: `chore: remove narration, streak, user-churn features`

---

## Task 2: Create Supabase read functions

Create a centralized module for all Supabase read queries used by admin pages.

**Create:** `src/apis/supabase-reads.ts`

```typescript
import { getSupabaseClient } from '@/lib/supabase'

// ── Boards ──

export async function fetchBoards() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('cohort', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data
}

export async function fetchBoard(boardId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('id', boardId)
    .single()

  if (error) throw error
  return data
}

export async function fetchLastBoard() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('cohort', { ascending: false, nullsFirst: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data
}

// ── Board Users (permissions) ──

export async function fetchBoardUsers(boardId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('user_board_permissions')
    .select(`
      permission,
      users (
        id, real_name, nickname, email, phone_number, profile_photo_url
      )
    `)
    .eq('board_id', boardId)

  if (error) throw error
  return data
}

// ── Waiting Users ──

export async function fetchWaitingUserIds(boardId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('board_waiting_users')
    .select(`
      user_id,
      users (
        id, real_name, nickname, email, phone_number, referrer, profile_photo_url
      )
    `)
    .eq('board_id', boardId)

  if (error) throw error
  return data
}

// ── Posts ──

export async function fetchPosts(boardId: string, dateRange: 'week' | 'all') {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('posts')
    .select(`
      id, board_id, title, content, thumbnail_image_url,
      author_id, author_name, created_at, updated_at,
      count_of_comments, count_of_replies, count_of_likes, engagement_score,
      users!author_id ( nickname )
    `)
    .eq('board_id', boardId)

  if (dateRange === 'week') {
    const { monday, sunday } = getWeekRange()
    query = query
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
  }

  const { data, error } = await query.order('engagement_score', { ascending: false })

  if (error) throw error
  return data
}

// ── Users ──

export async function fetchUsersByIds(userIds: string[]) {
  if (userIds.length === 0) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, email, phone_number, profile_photo_url')
    .in('id', userIds)

  if (error) throw error
  return data
}

// ── Previous cohort posts count ──

export async function fetchPreviousCohortPostCount(
  userId: string,
  currentCohort: number
) {
  const supabase = getSupabaseClient()

  // Find previous cohort board
  const { data: prevBoard } = await supabase
    .from('boards')
    .select('id')
    .eq('cohort', currentCohort - 1)
    .limit(1)
    .single()

  if (!prevBoard) return null

  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('board_id', prevBoard.id)
    .eq('author_id', userId)

  if (error) return null
  return count
}

// ── App Config ──

export async function fetchAppConfig() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['active_board_id', 'upcoming_board_id'])

  if (error) throw error

  const config: Record<string, string> = {}
  for (const row of data ?? []) {
    config[row.key] = row.value
  }
  return {
    active_board_id: config['active_board_id'] ?? '',
    upcoming_board_id: config['upcoming_board_id'] ?? '',
  }
}

export async function updateAppConfig(
  activeBoardId: string,
  upcomingBoardId: string
) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('app_config').upsert([
    { key: 'active_board_id', value: activeBoardId },
    { key: 'upcoming_board_id', value: upcomingBoardId },
  ])
  if (error) throw error
}

// ── Helpers ──

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { monday, sunday }
}
```

**Step 1:** Create the file above.

**Step 2:** Run `npm run build` to verify the new module compiles.

**Step 3:** Commit: `feat: add Supabase read functions for admin pages`

---

## Task 3: Migrate boards list page

**Modify:** `src/app/admin/boards/page.tsx`

**Step 1:** Replace the `fetchBoards` function (lines 39-60) with a call to `supabase-reads`:

```typescript
import { fetchBoards as fetchBoardsFromSupabase } from '@/apis/supabase-reads'

const fetchBoards = async (): Promise<Board[]> => {
  const rows = await fetchBoardsFromSupabase()
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    cohort: row.cohort ?? undefined,
    firstDay: row.first_day ? new Date(row.first_day) : undefined,
    lastDay: row.last_day ? new Date(row.last_day) : undefined,
    createdAt: new Date(row.created_at),
    waitingUsersIds: [], // Not used on this page
  }))
}
```

**Step 2:** Remove `collection, getDocs, getFirestore, Timestamp` from the firebase/firestore import. The `Timestamp` import may still be needed for date handling in the template — replace `instanceof Timestamp` checks with simple `instanceof Date` since dates now come as `Date` objects from the mapper above.

**Step 3:** Run `npm run dev`, navigate to `/admin/boards`, verify the board list renders correctly with cohort, title, dates.

**Step 4:** Commit: `refactor: boards list page reads from Supabase`

---

## Task 4: Migrate board detail page

**Modify:** `src/app/admin/boards/[boardId]/page.tsx`

**Step 1:** Replace `fetchBoard` function (lines 33-52) with Supabase read:

```typescript
import { fetchBoard as fetchBoardFromSupabase, fetchBoardUsers as fetchBoardUsersFromSupabase } from '@/apis/supabase-reads'

const fetchBoard = async (boardId: string): Promise<Board | null> => {
  if (!boardId) return null
  const row = await fetchBoardFromSupabase(boardId)
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    cohort: row.cohort ?? undefined,
    firstDay: row.first_day ? new Date(row.first_day) : undefined,
    lastDay: row.last_day ? new Date(row.last_day) : undefined,
    createdAt: new Date(row.created_at),
    waitingUsersIds: [], // Waiting users queried separately
  }
}
```

**Step 2:** Replace `fetchBoardUsers` function (lines 55-72). The Firestore version queries `where('boardPermissions.X', 'in', [...])`. The Supabase version JOINs `user_board_permissions` with `users`:

```typescript
const fetchBoardUsers = async (boardId: string) => {
  if (!boardId) return []
  const rows = await fetchBoardUsersFromSupabase(boardId)
  return rows.map(row => ({
    ...row.users,
    permission: row.permission,
  }))
}
```

**Step 3:** Update the template to use the new data shape. The current code accesses `user.boardPermissions[boardId]` (line 351). With Supabase data, permission comes from the JOIN result. Change to `user.permission`.

**Step 4:** Update the "waiting users" section (lines 280-288). Instead of `board.waitingUsersIds`, query `board_waiting_users` via `fetchWaitingUserIds` from supabase-reads. Or simply show the count from a separate query.

**Step 5:** Remove Firebase imports: `collection, doc, getDoc, getDocs, getFirestore, query, where, Timestamp`.

**Step 6:** Run `npm run dev`, navigate to `/admin/boards/{boardId}`, verify board info and user permissions table.

**Step 7:** Commit: `refactor: board detail page reads from Supabase`

---

## Task 5: Migrate user approval page reads

**Modify:** `src/app/admin/user-approval/page.tsx`

This is the most complex page — it reads boards, a selected board, waiting users, user details, and previous cohort post counts.

**Step 1:** Replace `fetchBoards` (lines 48-62) — same pattern as Task 3.

**Step 2:** Replace `fetchBoard` (lines 65-84) — same pattern as Task 4.

**Step 3:** Replace `fetchWaitingUsers` (lines 87-141). Currently it:
1. Reads `board.waitingUsersIds` array
2. Fetches each user doc individually
3. Queries previous cohort board by `where('cohort', '==', previousCohort)`
4. Queries user's `postings` subcollection for post count

Replace with:

```typescript
import {
  fetchWaitingUserIds,
  fetchPreviousCohortPostCount,
} from '@/apis/supabase-reads'

const fetchWaitingUsers = async (boardId: string, cohort: number | null): Promise<WaitingUser[]> => {
  const rows = await fetchWaitingUserIds(boardId)
  if (!rows || rows.length === 0) return []

  const users: WaitingUser[] = []
  for (const row of rows) {
    const u = row.users
    if (!u) continue

    let previousPostsCount: number | null = null
    if (cohort) {
      previousPostsCount = await fetchPreviousCohortPostCount(u.id, cohort)
    }

    users.push({
      uid: u.id,
      id: u.id,
      realName: u.real_name,
      nickname: u.nickname,
      email: u.email,
      phoneNumber: u.phone_number,
      referrer: u.referrer,
      profilePhotoURL: u.profile_photo_url,
      boardPermissions: {},
      updatedAt: null,
      previousPostsCount,
    })
  }
  return users
}
```

**Step 4:** Update the `useQuery` for waiting users — change `enabled` condition. Currently it checks `selectedBoard.waitingUsersIds.length > 0`. With Supabase, we don't know the count before querying. Change to `enabled: !!selectedBoardId`.

**Step 5:** Update the waiting user count display. Currently shows `selectedBoard?.waitingUsersIds?.length || 0`. Replace with `waitingUsers.length`.

**Step 6:** Remove Firestore imports from reads: `doc, getDoc, collection, query, where, getDocs, getFirestore`. Keep `updateDoc, arrayRemove` for the writes (dual-write stays for now).

**Step 7:** Run `npm run dev`, navigate to `/admin/user-approval`, select a board, verify waiting users display.

**Step 8:** Commit: `refactor: user approval page reads from Supabase`

---

## Task 6: Migrate posts page

**Modify:** `src/app/admin/posts/page.tsx`

**Step 1:** Replace `fetchBoards` (lines 67-81) — same pattern.

**Step 2:** Replace `fetchPosts` (lines 99-135). Currently queries `boards/{boardId}/posts` subcollection. With Supabase, posts are a flat table with `board_id` column:

```typescript
import { fetchPosts as fetchPostsFromSupabase } from '@/apis/supabase-reads'

const fetchPosts = async (boardId: string | null, dateRange: 'week' | 'all'): Promise<Post[]> => {
  if (!boardId) return []
  const rows = await fetchPostsFromSupabase(boardId, dateRange)
  return rows.map(row => ({
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    content: row.content,
    thumbnailImageURL: row.thumbnail_image_url ?? undefined,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    countOfComments: row.count_of_comments,
    countOfReplies: row.count_of_replies,
    countOfLikes: row.count_of_likes,
  }))
}
```

**Step 3:** Replace `fetchUsers` (lines 40-64). Currently fetches each user doc individually. With Supabase, batch query:

```typescript
import { fetchUsersByIds } from '@/apis/supabase-reads'

const fetchUsers = async (userIds: string[]): Promise<Record<string, User>> => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}
  const rows = await fetchUsersByIds(uniqueIds)
  const map: Record<string, User> = {}
  for (const row of rows) {
    map[row.id] = {
      uid: row.id,
      id: row.id,
      realName: row.real_name,
      nickname: row.nickname,
      email: row.email,
      phoneNumber: row.phone_number,
      profilePhotoURL: row.profile_photo_url,
      boardPermissions: {},
      updatedAt: null,
    } as User
  }
  return map
}
```

**Step 4:** Since `fetchPostsFromSupabase` already includes `users!author_id(nickname)` via JOIN, we can use `row.users?.nickname` directly and potentially skip the separate `fetchUsers` call. But keeping it for now is fine since it also provides other user fields.

**Step 5:** Remove `Timestamp` instanceof checks in date rendering — dates are now `Date` objects.

**Step 6:** Remove Firebase imports.

**Step 7:** Run `npm run dev`, navigate to `/admin/posts`, verify posts table renders.

**Step 8:** Commit: `refactor: posts page reads from Supabase`

---

## Task 7: Migrate board config (Remote Config → app_config)

**Modify:** `src/hooks/useRemoteConfig.ts`

Replace Firebase Remote Config client SDK reads with Supabase `app_config` table reads.

**Step 1:** Rewrite the hook:

```typescript
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAppConfig, updateAppConfig } from '@/apis/supabase-reads'

export function useRemoteConfig() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    data: configValues,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['appConfig'],
    queryFn: fetchAppConfig,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })

  const forceRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['appConfig'] })
  }

  const updateMutation = useMutation({
    mutationFn: async ({ activeBoardId, upcomingBoardId }: { activeBoardId: string; upcomingBoardId: string }) => {
      if (activeBoardId && upcomingBoardId && activeBoardId === upcomingBoardId) {
        throw new Error('현재 진행 중인 게시판과 다음 예정 게시판은 달라야 합니다.')
      }
      await updateAppConfig(activeBoardId, upcomingBoardId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] })
      setError(null)
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const validateBoards = (activeBoardId: string, upcomingBoardId: string): boolean => {
    if (!activeBoardId && !upcomingBoardId) return true
    if (!activeBoardId || !upcomingBoardId) return true
    return activeBoardId !== upcomingBoardId
  }

  return {
    activeBoardId: configValues?.active_board_id || '',
    upcomingBoardId: configValues?.upcoming_board_id || '',
    isLoading,
    isUpdating: updateMutation.isPending,
    isRefreshing: false,
    error,
    updateBoards: updateMutation.mutate,
    updateBoardsAsync: updateMutation.mutateAsync,
    refetch,
    forceRefresh,
    validateBoards,
    clearError: () => setError(null),
  }
}
```

**Step 2:** Remove `useRemoteConfigValue` export if nothing uses it. Check with grep.

**Step 3:** Remove the Firebase Remote Config import from `src/lib/firebase.ts` — remove `remoteConfig` export and the Remote Config initialization code. Keep `db`, `auth`, `storage` exports.

**Step 4:** Delete `src/app/api/remote-config/route.ts` — no longer needed since reads and writes go directly to Supabase.

**Step 5:** Run `npm run dev`, navigate to `/admin/boards`, verify the active/upcoming board settings load and save correctly.

**Step 6:** Commit: `refactor: board config reads/writes from Supabase app_config`

---

## Task 8: Migrate board creation reads

**Modify:** `src/hooks/useCreateUpcomingBoard.ts`

The `generateNextCohort` function queries Firestore for the last board by cohort. The `createBoardMutation` writes to Firestore + dual-writes to Supabase.

**Step 1:** Replace the read in `generateNextCohort` (lines 95-147):

```typescript
import { fetchLastBoard } from '@/apis/supabase-reads'

const generateNextCohort = async (): Promise<CreateBoardData | null> => {
  try {
    setIsCreating(true)
    const lastBoard = await fetchLastBoard()

    if (!lastBoard) {
      const firstDay = getNextMonday(new Date())
      const lastDay = getFridayOf4thWeek(firstDay)
      return {
        cohort: 1,
        title: '매일 글쓰기 프렌즈 1기',
        description: `${formatDateForDescription(firstDay)} - ${formatDateForDescription(lastDay)}`,
        firstDay,
        lastDay,
      }
    }

    const nextCohort = (lastBoard.cohort || 0) + 1
    const baseDate = lastBoard.last_day ? new Date(lastBoard.last_day) : new Date()
    const firstDay = getNextMonday(baseDate)
    const lastDay = getFridayOf4thWeek(firstDay)

    return {
      cohort: nextCohort,
      title: `매일 글쓰기 프렌즈 ${nextCohort}기`,
      description: `${formatDateForDescription(firstDay)} - ${formatDateForDescription(lastDay)}`,
      firstDay,
      lastDay,
    }
  } catch (error) {
    console.error('Error generating next cohort:', error)
    return null
  } finally {
    setIsCreating(false)
  }
}
```

**Step 2:** The `createBoardMutation` still writes to Firestore + dual-writes to Supabase. Leave this as-is for now (writes are a follow-up task).

**Step 3:** Remove unused Firestore imports: `query, orderBy, limit, getDocs`. Keep `collection, addDoc, Timestamp` for the write path.

**Step 4:** Run `npm run dev`, test creating a new cohort from `/admin/boards`.

**Step 5:** Commit: `refactor: board creation reads last cohort from Supabase`

---

## Task 9: Clean up unused Firebase code

After all reads are migrated, remove Firebase code that's no longer referenced.

**Step 1:** Check if `src/hooks/useCollection.ts` is still imported anywhere:

```bash
grep -r "useCollection" src/ --include="*.ts" --include="*.tsx"
```

If only imported by deleted files → delete `src/hooks/useCollection.ts`.

**Step 2:** Check if `src/hooks/useDocument.ts` is still imported anywhere. If not → delete.

**Step 3:** Check if `firebase/firestore` is still imported anywhere (for remaining writes). List all remaining Firebase imports:

```bash
grep -r "firebase/firestore" src/ --include="*.ts" --include="*.tsx"
```

The remaining imports should only be in:
- `src/hooks/useCreateUpcomingBoard.ts` (write: `addDoc`, `Timestamp`)
- `src/app/admin/user-approval/page.tsx` (write: `updateDoc`, `arrayRemove`)
- `src/lib/firebase.ts` (initialization)
- `src/hooks/useAuth.ts` (auth)
- `src/apis/holidays.ts` (holidays stays on Firebase)
- `src/hooks/useAllFCMTokens.ts` (FCM stays on Firebase)
- `src/types/firestore.ts` (Timestamp type)

**Step 4:** Remove `remoteConfig` from `src/lib/firebase.ts` if not done in Task 7. Remove `firebase/remote-config` import.

**Step 5:** Remove `src/app/api/firebaseAdmin.ts` if the remote-config API route was the only consumer. Check:

```bash
grep -r "firebaseAdmin" src/ --include="*.ts" --include="*.tsx"
```

If also used by `src/app/api/send-fcm/route.ts` → keep it.

**Step 6:** Run `npm run build` — verify zero errors.

**Step 7:** Commit: `chore: remove unused Firebase read hooks and Remote Config`

---

## Summary

| Task | Page/Feature | Change |
|------|-------------|--------|
| 1 | Narration, Streak, User-churn | Delete entirely |
| 2 | — | Create `supabase-reads.ts` |
| 3 | `/admin/boards` | Boards list → Supabase |
| 4 | `/admin/boards/[id]` | Board detail + users → Supabase |
| 5 | `/admin/user-approval` | Waiting users + previous posts → Supabase |
| 6 | `/admin/posts` | Posts + authors → Supabase |
| 7 | Board config | Remote Config → app_config table |
| 8 | Board creation | Last cohort query → Supabase |
| 9 | — | Clean up dead Firebase code |

**Not in scope (remains on Firebase):**
- Holidays CRUD (`src/apis/holidays.ts`)
- FCM tokens (`src/hooks/useAllFCMTokens.ts`)
- Firebase Auth (`src/hooks/useAuth.ts`)
- Write operations (dual-write pattern stays for now)
