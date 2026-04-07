import { getSupabaseClient } from '@/lib/supabase'
import { Board } from '@/types/firestore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupabaseBoard {
  id: string
  title: string
  description: string
  first_day: string | null
  last_day: string | null
  cohort: number | null
  created_at: string
  updated_at: string
}

export interface SupabaseUser {
  id: string
  real_name: string | null
  nickname: string | null
  email: string | null
  phone_number: string | null
  profile_photo_url: string | null
  bio: string | null
  referrer: string | null
  created_at: string
  updated_at: string
}

export interface BoardUser {
  permission: 'read' | 'write'
  user: Pick<SupabaseUser, 'id' | 'real_name' | 'nickname' | 'email' | 'phone_number' | 'profile_photo_url'>
}

export interface WaitingUser {
  user_id: string
  user: Pick<SupabaseUser, 'id' | 'real_name' | 'nickname' | 'email' | 'phone_number' | 'referrer' | 'profile_photo_url'>
}

export interface SupabasePost {
  id: string
  board_id: string
  author_id: string
  author_name: string
  title: string
  content: string
  thumbnail_image_url: string | null
  count_of_comments: number
  count_of_replies: number
  count_of_likes: number
  engagement_score: number | null
  created_at: string
  updated_at: string
  users: { nickname: string | null } | null
}

export interface AppConfig {
  active_board_id: string
  upcoming_board_id: string
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function getWeekRange(): { monday: Date; sunday: Date } {
  const now = new Date()
  const day = now.getDay() // 0 = Sun, 1 = Mon, …, 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { monday, sunday }
}

// ---------------------------------------------------------------------------
// Board queries
// ---------------------------------------------------------------------------

/** Select all boards ordered by cohort DESC (nulls last). */
export async function fetchBoards(): Promise<SupabaseBoard[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('cohort', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data as SupabaseBoard[]
}

/** Select a single board by id. */
export async function fetchBoard(boardId: string): Promise<SupabaseBoard> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('id', boardId)
    .single()

  if (error) throw error
  return data as SupabaseBoard
}

/** Select the board with the highest cohort. Returns null if no boards exist. */
export async function fetchLastBoard(): Promise<SupabaseBoard | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('cohort', { ascending: false, nullsFirst: false })
    .limit(1)
    .single()

  if (error) {
    // PGRST116 = "no rows returned" — not a real error for this use-case
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as SupabaseBoard
}

// ---------------------------------------------------------------------------
// User / permission queries
// ---------------------------------------------------------------------------

/** Select board members with their permission level. */
export async function fetchBoardUsers(boardId: string): Promise<BoardUser[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('user_board_permissions')
    .select('permission, users(id, real_name, nickname, email, phone_number, profile_photo_url)')
    .eq('board_id', boardId)

  if (error) throw error

  return (data ?? []).map((row: { permission: string; users: unknown }) => ({
    permission: row.permission as 'read' | 'write',
    user: row.users as BoardUser['user'],
  }))
}

/** Select users waiting to join a board. */
export async function fetchWaitingUserIds(boardId: string): Promise<WaitingUser[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('board_waiting_users')
    .select('user_id, users(id, real_name, nickname, email, phone_number, referrer, profile_photo_url)')
    .eq('board_id', boardId)

  if (error) throw error

  return (data ?? []).map((row: { user_id: string; users: unknown }) => ({
    user_id: row.user_id,
    user: row.users as WaitingUser['user'],
  }))
}

/** Select all users ordered by created_at DESC. */
export async function fetchAllUsers(): Promise<SupabaseUser[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as SupabaseUser[]
}

/** Select users by an array of ids. */
export async function fetchUsersByIds(userIds: string[]): Promise<SupabaseUser[]> {
  if (userIds.length === 0) return []

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('id', userIds)

  if (error) throw error
  return data as SupabaseUser[]
}

/** Search users by nickname, real_name, or email. Returns up to 10 matches. */
export async function searchUsers(query: string) {
  if (!query || query.length < 2) return []

  const supabase = getSupabaseClient()
  // Only escape characters that break PostgREST .or() filter syntax (commas, parens)
  // Keep dots and other valid email/name characters intact
  const escaped = query.replace(/[,()"'\\]/g, '')
  if (!escaped) return []

  const pattern = `%${escaped}%`

  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, email')
    .or(`nickname.ilike.${pattern},real_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(10)

  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Post queries
// ---------------------------------------------------------------------------

/** Select posts for a board, optionally filtered to the current week. */
export async function fetchPosts(
  boardId: string,
  dateRange: 'week' | 'all'
): Promise<SupabasePost[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('posts')
    .select('*, users!author_id(nickname)')
    .eq('board_id', boardId)
    .order('engagement_score', { ascending: false, nullsFirst: false })

  if (dateRange === 'week') {
    const { monday, sunday } = getWeekRange()
    query = query
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
  }

  const { data, error } = await query
  if (error) throw error
  return data as SupabasePost[]
}

/**
 * Count posts by a user in the board whose cohort is (currentCohort - 1).
 * Returns null when the previous cohort board doesn't exist or on error.
 */
export async function fetchPreviousCohortPostCount(
  userId: string,
  currentCohort: number
): Promise<number | null> {
  try {
    const supabase = getSupabaseClient()

    // 1. Find the previous cohort board
    const { data: boardData, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('cohort', currentCohort - 1)
      .single()

    if (boardError) {
      // PGRST116 means no previous cohort board
      if (boardError.code === 'PGRST116') return null
      throw boardError
    }

    const previousBoardId = boardData.id

    // 2. Count posts by this user in that board
    const { count, error: countError } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', previousBoardId)
      .eq('author_id', userId)

    if (countError) throw countError
    return count ?? 0
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

/** Read active_board_id and upcoming_board_id from app_config. */
export async function fetchAppConfig(): Promise<AppConfig> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['active_board_id', 'upcoming_board_id'])

  if (error) throw error

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.key] = row.value
  }

  return {
    active_board_id: map['active_board_id'] ?? '',
    upcoming_board_id: map['upcoming_board_id'] ?? '',
  }
}

// ---------------------------------------------------------------------------
// Shared Board mapper  (SupabaseBoard → Board)
// ---------------------------------------------------------------------------

function mapToBoard(row: SupabaseBoard): Board {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    cohort: row.cohort ?? undefined,
    firstDay: row.first_day ? new Date(row.first_day) : undefined,
    lastDay: row.last_day ? new Date(row.last_day) : undefined,
    createdAt: new Date(row.created_at),
    waitingUsersIds: [],
  }
}

/** Fetch all boards mapped to the app-level Board type. */
export async function fetchBoardsMapped(): Promise<Board[]> {
  const rows = await fetchBoards()
  return rows.map(mapToBoard)
}

/** Fetch a single board mapped to the app-level Board type. Returns null on error. */
export async function fetchBoardMapped(boardId: string): Promise<Board | null> {
  try {
    const row = await fetchBoard(boardId)
    return mapToBoard(row)
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'PGRST116') return null
    throw e
  }
}

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

/** Upsert active_board_id and upcoming_board_id in app_config. */
export async function updateAppConfig(
  activeBoardId: string,
  upcomingBoardId: string
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('app_config').upsert(
    [
      { key: 'active_board_id', value: activeBoardId },
      { key: 'upcoming_board_id', value: upcomingBoardId },
    ],
    { onConflict: 'key' }
  )

  if (error) throw error
}
