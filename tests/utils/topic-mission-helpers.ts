/**
 * Helper utilities for topic-mission E2E and DB tests.
 *
 * All setup uses the Supabase service_role key (local dev only).
 * These helpers are NOT imported by the web app — test-only.
 */

export const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

// Local dev keys — not secret (deterministic by Supabase CLI)
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Board IDs used across topic-mission E2E tests */
export const TOPIC_TEST_BOARD_ID = 'topic-mission-e2e-board';
export const TOPIC_TEST_BOARD_B_ID = 'topic-mission-e2e-board-b';

/** Test user IDs (from tests/fixtures/e2e-users.json, seeded by seed-e2e-users.ts) */
export const REGULAR_USER_ID = '11445913-6c79-4b52-99ec-39da7d0337ed'; // e2e@example.com
export const SECOND_USER_ID = 'bedcc0a7-b9ee-4070-bf8b-19c7bb4f1dd6'; // e2e2@example.com

// ---------------------------------------------------------------------------
// Low-level fetch with service_role credentials
// ---------------------------------------------------------------------------

export async function serviceRoleFetch(path: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${LOCAL_SUPABASE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

export async function setupTestBoard(boardId: string, title: string) {
  const res = await serviceRoleFetch('/rest/v1/boards', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: boardId, title }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`setupTestBoard failed: ${res.status} ${await res.text()}`);
  }
}

export async function teardownTestBoard(boardId: string) {
  // ON DELETE CASCADE removes topic_missions + user_board_permissions
  await serviceRoleFetch(`/rest/v1/boards?id=eq.${boardId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Board membership helpers
// ---------------------------------------------------------------------------

export async function grantBoardMembership(userId: string, boardId: string) {
  const res = await serviceRoleFetch('/rest/v1/user_board_permissions', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, board_id: boardId, permission: 'write' }),
  });
  if (!res.ok) {
    throw new Error(`grantBoardMembership failed: ${res.status} ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// Topic mission helpers
// ---------------------------------------------------------------------------

/**
 * Creates a topic_missions entry (trigger assigns order_index server-side).
 * Optionally updates status after insert (default is 'pending').
 */
export async function createTopicMission(
  boardId: string,
  userId: string,
  topic: string,
  status: 'pending' | 'assigned' | 'completed' | 'skipped' = 'pending',
): Promise<string> {
  const insertRes = await serviceRoleFetch('/rest/v1/topic_missions', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ board_id: boardId, user_id: userId, topic }),
  });
  if (!insertRes.ok) {
    throw new Error(`createTopicMission insert failed: ${insertRes.status} ${await insertRes.text()}`);
  }
  const rows = (await insertRes.json()) as Array<{ id: string }>;
  const id = rows[0]?.id;
  if (!id) throw new Error('createTopicMission: no id returned');

  if (status !== 'pending') {
    const updateRes = await serviceRoleFetch(`/rest/v1/topic_missions?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status }),
    });
    if (!updateRes.ok) {
      throw new Error(`createTopicMission update failed: ${updateRes.status} ${await updateRes.text()}`);
    }
  }

  return id;
}

export async function deleteTopicMissions(boardId: string) {
  await serviceRoleFetch(`/rest/v1/topic_missions?board_id=eq.${boardId}`, { method: 'DELETE' });
}

export async function getTopicMissions(boardId: string) {
  const res = await serviceRoleFetch(
    `/rest/v1/topic_missions?board_id=eq.${boardId}&order=order_index.asc`,
  );
  return res.json() as Promise<
    Array<{
      id: string;
      user_id: string;
      status: string;
      topic: string;
      order_index: number;
      updated_at: string;
    }>
  >;
}

/**
 * Calls the advance_topic_presenter Postgres RPC via service_role.
 * Equivalent to what the assign-topic-presenter edge function does.
 */
export async function advanceTopicPresenter(boardId: string) {
  const res = await serviceRoleFetch('/rest/v1/rpc/advance_topic_presenter', {
    method: 'POST',
    body: JSON.stringify({ p_board_id: boardId }),
  });
  if (!res.ok) {
    throw new Error(`advanceTopicPresenter RPC failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Auth helper for RLS tests
// ---------------------------------------------------------------------------

/**
 * Authenticates a user via GoTrue REST and returns their access_token.
 * Used in DB tests that need to verify RLS policies from the user's perspective.
 */
export async function getUserAccessToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${LOCAL_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`getUserAccessToken failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Fetches from the Supabase REST API using a user JWT (for RLS verification).
 */
export async function userFetch(jwt: string, path: string) {
  const url = path.startsWith('http') ? path : `${LOCAL_SUPABASE_URL}${path}`;
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      apikey: ANON_KEY,
    },
  });
}
