import { adminGet, adminPost } from '@/lib/api-client';
import type {
  ApproveUserRequest,
  ApproveUserResponse,
  CreateBoardRequest,
  CreateBoardResponse,
  GetAppConfigResponse,
  GetBoardResponse,
  GetBoardUsersResponse,
  GetBoardsResponse,
  GetLastBoardResponse,
  GetMeResponse,
  GetPostsResponse,
  GetPreviousCohortPostsResponse,
  GetUsersByIdsRequest,
  GetUsersByIdsResponse,
  GetUsersResponse,
  GetWaitingUsersResponse,
  PostsRange,
  RejectUserRequest,
  RejectUserResponse,
  SearchUsersResponse,
  UpdateAppConfigRequest,
  UpdateAppConfigResponse,
} from '@/types/admin-api-contracts';

// =============================================================================
// React Query keys — single source of truth across all admin pages
// =============================================================================

export const adminQueryKeys = {
  me: ['admin', 'me'] as const,
  boards: ['admin', 'boards'] as const,
  board: (id: string) => ['admin', 'board', id] as const,
  boardLast: ['admin', 'board', 'last'] as const,
  boardUsers: (boardId: string) => ['admin', 'board', boardId, 'users'] as const,
  waitingUsers: (boardId: string) => ['admin', 'board', boardId, 'waiting-users'] as const,
  users: ['admin', 'users'] as const,
  userSearch: (q: string) => ['admin', 'users', 'search', q] as const,
  usersByIds: (ids: string[]) => ['admin', 'users', 'by-ids', ...ids.slice().sort()] as const,
  previousCohortPosts: (userId: string, cohort: number) =>
    ['admin', 'users', userId, 'previous-cohort-posts', cohort] as const,
  posts: (boardId: string, range: PostsRange) => ['admin', 'posts', boardId, range] as const,
  appConfig: ['admin', 'app-config'] as const,
};

// =============================================================================
// Read wrappers
// =============================================================================

export function getMe(): Promise<GetMeResponse> {
  return adminGet<GetMeResponse>('/api/admin/me');
}

export async function getBoards(): Promise<GetBoardsResponse['boards']> {
  const res = await adminGet<GetBoardsResponse>('/api/admin/boards');
  return res.boards;
}

export async function getBoard(boardId: string): Promise<GetBoardResponse['board']> {
  const res = await adminGet<GetBoardResponse>(`/api/admin/boards/${encodeURIComponent(boardId)}`);
  return res.board;
}

export async function getLastBoard(): Promise<GetLastBoardResponse['board']> {
  const res = await adminGet<GetLastBoardResponse>('/api/admin/boards/last');
  return res.board;
}

export async function getBoardUsers(boardId: string): Promise<GetBoardUsersResponse['users']> {
  const res = await adminGet<GetBoardUsersResponse>(
    `/api/admin/boards/${encodeURIComponent(boardId)}/users`,
  );
  return res.users;
}

export async function getWaitingUsers(boardId: string): Promise<GetWaitingUsersResponse['users']> {
  const res = await adminGet<GetWaitingUsersResponse>(
    `/api/admin/boards/${encodeURIComponent(boardId)}/waiting-users`,
  );
  return res.users;
}

export async function getUsers(): Promise<GetUsersResponse['users']> {
  const res = await adminGet<GetUsersResponse>('/api/admin/users');
  return res.users;
}

export async function searchUsers(query: string): Promise<SearchUsersResponse['users']> {
  if (!query || query.length < 2) return [];
  const res = await adminGet<SearchUsersResponse>(
    `/api/admin/users/search?q=${encodeURIComponent(query)}`,
  );
  return res.users;
}

export async function getUsersByIds(ids: string[]): Promise<GetUsersByIdsResponse['users']> {
  if (ids.length === 0) return [];
  const body: GetUsersByIdsRequest = { ids };
  const res = await adminPost<GetUsersByIdsResponse, GetUsersByIdsRequest>(
    '/api/admin/users/by-ids',
    body,
  );
  return res.users;
}

export async function getPreviousCohortPostCount(
  userId: string,
  currentCohort: number,
): Promise<GetPreviousCohortPostsResponse['count']> {
  const res = await adminGet<GetPreviousCohortPostsResponse>(
    `/api/admin/users/${encodeURIComponent(userId)}/previous-cohort-posts?cohort=${currentCohort}`,
  );
  return res.count;
}

export async function getPosts(
  boardId: string,
  range: PostsRange,
): Promise<GetPostsResponse['posts']> {
  const res = await adminGet<GetPostsResponse>(
    `/api/admin/posts?boardId=${encodeURIComponent(boardId)}&range=${range}`,
  );
  return res.posts;
}

export async function getAppConfig(): Promise<GetAppConfigResponse['config']> {
  const res = await adminGet<GetAppConfigResponse>('/api/admin/app-config');
  return res.config;
}

// =============================================================================
// Mutation wrappers
// =============================================================================

export function approveUser(body: ApproveUserRequest): Promise<ApproveUserResponse> {
  return adminPost<ApproveUserResponse, ApproveUserRequest>('/api/admin/users/approve', body);
}

export function rejectUser(body: RejectUserRequest): Promise<RejectUserResponse> {
  return adminPost<RejectUserResponse, RejectUserRequest>('/api/admin/users/reject', body);
}

export async function createBoard(body: CreateBoardRequest): Promise<CreateBoardResponse['board']> {
  const res = await adminPost<CreateBoardResponse, CreateBoardRequest>('/api/admin/boards', body);
  return res.board;
}

export async function updateAppConfig(
  body: UpdateAppConfigRequest,
): Promise<UpdateAppConfigResponse['config']> {
  const res = await adminPost<UpdateAppConfigResponse, UpdateAppConfigRequest>(
    '/api/admin/app-config',
    body,
  );
  return res.config;
}
