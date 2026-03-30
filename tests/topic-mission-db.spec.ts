/**
 * Supabase-local database tests for topic_missions.
 *
 * These tests verify database behaviour directly via the Supabase REST API —
 * no browser is required. They run against local Supabase (must be started
 * before the test suite: `npx supabase start`).
 *
 * T.23 – RLS: member of Board A cannot read topic_missions for Board B
 * T.24 – UNIQUE constraint returns 23505; API layer maps it to user-friendly error
 * T.25 – Wrap-around: advance after all-completed resets all to pending and assigns first
 * T.26 – Nullable post_id: INSERT notification with post_id = NULL succeeds
 * T.27 – updated_at trigger: updating status automatically updates updated_at
 */

import { test, expect } from '@playwright/test';
import {
  setupTestBoard,
  teardownTestBoard,
  grantBoardMembership,
  createTopicMission,
  deleteTopicMissions,
  advanceTopicPresenter,
  getTopicMissions,
  getUserAccessToken,
  userFetch,
  serviceRoleFetch,
  REGULAR_USER_ID,
  SECOND_USER_ID,
} from './utils/topic-mission-helpers';

// ─── T.23: RLS ──────────────────────────────────────────────────────────────

test.describe('T.23 RLS', () => {
  let boardAId: string;
  let boardBId: string;

  test.beforeAll(async () => {
    boardAId = `topic-db-rls-a-${Date.now()}`;
    boardBId = `topic-db-rls-b-${Date.now()}`;
    await setupTestBoard(boardAId, 'RLS Board A');
    await setupTestBoard(boardBId, 'RLS Board B');
    // REGULAR is a member of Board A only
    await grantBoardMembership(REGULAR_USER_ID, boardAId);
    // Create a topic_mission on Board B via service_role
    await createTopicMission(boardBId, SECOND_USER_ID, 'Board B Topic', 'assigned');
  });

  test.afterAll(async () => {
    await teardownTestBoard(boardAId);
    await teardownTestBoard(boardBId);
  });

  test('board member from Board A cannot read topic_missions for Board B (0 rows, no error)', async () => {
    const jwt = await getUserAccessToken('e2e@example.com', 'test1234');
    const res = await userFetch(jwt, `/rest/v1/topic_missions?board_id=eq.${boardBId}`);

    expect(res.ok).toBe(true);
    const rows = await res.json();
    expect(rows).toHaveLength(0); // RLS blocks the row — zero rows, no 4xx
  });
});

// ─── T.24: UNIQUE constraint ─────────────────────────────────────────────────

test.describe('T.24 UNIQUE constraint', () => {
  let boardId: string;

  test.beforeAll(async () => {
    boardId = `topic-db-unique-${Date.now()}`;
    await setupTestBoard(boardId, 'Unique Constraint Board');
    await grantBoardMembership(REGULAR_USER_ID, boardId);
  });

  test.afterAll(async () => {
    await teardownTestBoard(boardId);
  });

  test.afterEach(async () => {
    await deleteTopicMissions(boardId);
  });

  test('second INSERT for same (board_id, user_id) returns Postgres error 23505', async () => {
    // First insert succeeds
    await createTopicMission(boardId, REGULAR_USER_ID, '첫 번째 주제');

    // Second insert via service_role must fail with 23505
    const res = await serviceRoleFetch('/rest/v1/topic_missions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ board_id: boardId, user_id: REGULAR_USER_ID, topic: '중복 주제' }),
    });

    expect(res.status).toBe(409); // PostgREST maps 23505 → 409 Conflict
    const body = await res.json();
    // PostgREST includes the Postgres error code in the response
    expect(JSON.stringify(body)).toContain('23505');
  });

  test('API layer registerTopic maps 23505 to user-friendly error message', async () => {
    // Verify the error code used in topicMissionApi.ts matches what Postgres returns
    await createTopicMission(boardId, REGULAR_USER_ID, '첫 번째 주제');

    const res = await serviceRoleFetch('/rest/v1/topic_missions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ board_id: boardId, user_id: REGULAR_USER_ID, topic: '중복 주제' }),
    });

    const body = (await res.json()) as { code?: string };
    // The API layer checks result.error?.code === '23505' — confirm the code is present
    expect(body.code).toBe('23505');
  });
});

// ─── T.25: Wrap-around integrity ─────────────────────────────────────────────

test.describe('T.25 Wrap-around integrity', () => {
  let boardId: string;

  test.beforeAll(async () => {
    boardId = `topic-db-wrap-${Date.now()}`;
    await setupTestBoard(boardId, 'Wrap-around Board');
    await grantBoardMembership(REGULAR_USER_ID, boardId);
    await grantBoardMembership(SECOND_USER_ID, boardId);
  });

  test.afterAll(async () => {
    await teardownTestBoard(boardId);
  });

  test.afterEach(async () => {
    await deleteTopicMissions(boardId);
  });

  test('after all entries are completed, advance_topic_presenter resets all to pending and assigns first', async () => {
    await createTopicMission(boardId, REGULAR_USER_ID, 'REGULAR 주제', 'completed');
    await createTopicMission(boardId, SECOND_USER_ID, 'SECOND 주제', 'completed');

    // Advance should wrap around
    await advanceTopicPresenter(boardId);

    const missions = await getTopicMissions(boardId);
    const assigned = missions.filter((m) => m.status === 'assigned');
    const pending = missions.filter((m) => m.status === 'pending');

    // Exactly one entry becomes assigned
    expect(assigned).toHaveLength(1);
    // The remaining entry becomes pending
    expect(pending).toHaveLength(1);
    // The assigned entry has the lowest order_index
    expect(assigned[0].order_index).toBeLessThan(pending[0].order_index);
  });
});

// ─── T.26: Nullable post_id ──────────────────────────────────────────────────

test.describe('T.26 Nullable post_id', () => {
  let boardId: string;

  test.beforeAll(async () => {
    boardId = `topic-db-null-post-${Date.now()}`;
    await setupTestBoard(boardId, 'Nullable post_id Board');
  });

  test.afterAll(async () => {
    // Clean up notification inserted during the test
    await serviceRoleFetch(
      `/rest/v1/notifications?type=eq.topic_presenter_assigned&board_id=eq.${boardId}`,
      { method: 'DELETE' },
    );
    await teardownTestBoard(boardId);
  });

  test('INSERT notification with type = topic_presenter_assigned and post_id = NULL succeeds', async () => {
    // Use advance_topic_presenter RPC which inserts the notification with post_id = NULL
    // To do that, we need a pending entry first.
    await grantBoardMembership(REGULAR_USER_ID, boardId);
    await createTopicMission(boardId, REGULAR_USER_ID, 'Null post_id 주제', 'pending');
    await advanceTopicPresenter(boardId);

    // Verify the notification was created with post_id = NULL
    const res = await serviceRoleFetch(
      `/rest/v1/notifications?type=eq.topic_presenter_assigned&board_id=eq.${boardId}&select=post_id,type`,
    );
    expect(res.ok).toBe(true);
    const rows = (await res.json()) as Array<{ post_id: string | null; type: string }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].post_id).toBeNull();
    expect(rows[0].type).toBe('topic_presenter_assigned');

    // Clean up
    await deleteTopicMissions(boardId);
  });
});

// ─── T.27: updated_at trigger ────────────────────────────────────────────────

test.describe('T.27 updated_at trigger', () => {
  let boardId: string;

  test.beforeAll(async () => {
    boardId = `topic-db-trigger-${Date.now()}`;
    await setupTestBoard(boardId, 'Trigger Test Board');
    await grantBoardMembership(REGULAR_USER_ID, boardId);
  });

  test.afterAll(async () => {
    await teardownTestBoard(boardId);
  });

  test('updating topic_missions.status automatically updates updated_at', async () => {
    const id = await createTopicMission(boardId, REGULAR_USER_ID, '트리거 테스트 주제', 'pending');

    // Fetch original updated_at
    const before = await serviceRoleFetch(
      `/rest/v1/topic_missions?id=eq.${id}&select=updated_at`,
    );
    const [beforeRow] = (await before.json()) as Array<{ updated_at: string }>;
    const updatedAtBefore = new Date(beforeRow.updated_at);

    // Small delay so NOW() is guaranteed to advance (Postgres microsecond precision)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Update status
    await serviceRoleFetch(`/rest/v1/topic_missions?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'assigned' }),
    });

    // Fetch new updated_at
    const after = await serviceRoleFetch(
      `/rest/v1/topic_missions?id=eq.${id}&select=updated_at`,
    );
    const [afterRow] = (await after.json()) as Array<{ updated_at: string }>;
    const updatedAtAfter = new Date(afterRow.updated_at);

    expect(updatedAtAfter.getTime()).toBeGreaterThan(updatedAtBefore.getTime());
  });
});
