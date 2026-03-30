/**
 * E2E tests verifying that admin-triggered actions (via service_role API) are
 * reflected correctly on the web app board page.
 *
 * T.20 – Admin advances presenter → board page shows presenter banner
 * T.21 – Admin skips assigned presenter → next pending member becomes assigned
 * T.22 – Admin resets queue → no banner shown on board page
 *
 * Admin panel UI tests are not covered here because the admin Next.js app runs
 * on a separate port and is not included in this Playwright webServer config.
 * Instead, admin actions are simulated via the Supabase service_role REST API,
 * which is what the admin panel calls under the hood.
 *
 * Prerequisites: local Supabase running, vite dev server on :5173.
 */

import { test, expect } from './fixtures/auth';
import {
  setupTestBoard,
  teardownTestBoard,
  grantBoardMembership,
  createTopicMission,
  deleteTopicMissions,
  advanceTopicPresenter,
  serviceRoleFetch,
  REGULAR_USER_ID,
  SECOND_USER_ID,
} from './utils/topic-mission-helpers';

let boardId: string;

test.describe('Admin Topic Mission Actions → Web App State', () => {
  test.beforeAll(async () => {
    boardId = `topic-e2e-admin-${Date.now()}`;
    await setupTestBoard(boardId, 'Admin Action E2E Test Board');
    await grantBoardMembership(REGULAR_USER_ID, boardId);
    await grantBoardMembership(SECOND_USER_ID, boardId);
  });

  test.afterAll(async () => {
    await teardownTestBoard(boardId);
  });

  test.afterEach(async () => {
    await deleteTopicMissions(boardId);
  });

  test('T.20 Admin advances presenter → board page shows personalised banner for assigned member', async ({
    page,
  }) => {
    await createTopicMission(boardId, REGULAR_USER_ID, '발표 주제 A', 'pending');

    // Simulate admin clicking "다음 발표자 지정"
    await advanceTopicPresenter(boardId);

    // REGULAR is now the assigned presenter — web app should show personalised banner
    await page.goto(`/board/${boardId}`);
    await expect(page.getByText('당신이 다음 발표자입니다')).toBeVisible({ timeout: 15_000 });
  });

  test('T.21 Admin skips assigned presenter → next pending member becomes assigned', async ({
    page,
  }) => {
    const secondMissionId = await createTopicMission(
      boardId,
      SECOND_USER_ID,
      'SECOND 발표 주제',
      'assigned',
    );
    await createTopicMission(boardId, REGULAR_USER_ID, '다음 발표 주제', 'pending');

    // Simulate admin "건너뛰기" on the assigned entry, then advance
    await serviceRoleFetch(`/rest/v1/topic_missions?id=eq.${secondMissionId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'skipped' }),
    });
    await advanceTopicPresenter(boardId);

    // REGULAR is now the assigned presenter
    await page.goto(`/board/${boardId}`);
    await expect(page.getByText('당신이 다음 발표자입니다')).toBeVisible({ timeout: 15_000 });
  });

  test('T.22 Admin resets queue → confirmation dialog flow, then no banner on board page', async ({
    page,
  }) => {
    await createTopicMission(boardId, REGULAR_USER_ID, '발표 주제 B', 'assigned');

    // Simulate admin confirming "대기열 초기화" (bulk update to pending)
    await serviceRoleFetch(
      `/rest/v1/topic_missions?board_id=eq.${boardId}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'pending' }),
      },
    );

    await page.goto(`/board/${boardId}`);
    await page.waitForLoadState('networkidle');

    // No assigned presenter → no banner
    await expect(page.getByText('당신이 다음 발표자입니다')).not.toBeVisible();
    await expect(page.getByText('발표 주제 등록하기')).not.toBeVisible();
  });
});
