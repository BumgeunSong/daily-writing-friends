/**
 * E2E tests for the PresenterBanner component on the board page.
 *
 * T.15 – Unregistered member sees banner with registration link
 * T.16 – Clicking banner link navigates to topic page; valid topic → success confirmation
 * T.17 – Already-registered member sees info state, no form
 * T.18 – Assigned presenter sees personalised banner
 * T.19 – No assigned presenter → banner not rendered
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
  REGULAR_USER_ID,
  SECOND_USER_ID,
} from './utils/topic-mission-helpers';

let boardId: string;

test.describe('PresenterBanner', () => {
  test.beforeAll(async () => {
    // Unique board ID per run to avoid cross-browser-project conflicts
    boardId = `topic-e2e-banner-${Date.now()}`;
    await setupTestBoard(boardId, 'Banner E2E Test Board');
    await grantBoardMembership(REGULAR_USER_ID, boardId);
    await grantBoardMembership(SECOND_USER_ID, boardId);
  });

  test.afterAll(async () => {
    // Cascade-deletes topic_missions and user_board_permissions
    await teardownTestBoard(boardId);
  });

  test.afterEach(async () => {
    // Reset topic_missions between tests
    await deleteTopicMissions(boardId);
  });

  test('T.15 Unregistered member sees banner with registration link when a presenter is assigned', async ({
    page,
  }) => {
    // SECOND is the assigned presenter; REGULAR has no entry
    await createTopicMission(boardId, SECOND_USER_ID, 'Playwright 아키텍처', 'assigned');

    await page.goto(`/board/${boardId}`);

    const registrationLink = page.getByRole('link', { name: '발표 주제 등록하기' });
    await expect(registrationLink).toBeVisible({ timeout: 15_000 });
    await expect(registrationLink).toHaveAttribute('href', `/board/${boardId}/topic`);
  });

  test('T.16 Clicking banner link navigates to topic page; submitting valid topic shows success', async ({
    page,
  }) => {
    await createTopicMission(boardId, SECOND_USER_ID, '테스트 전략', 'assigned');

    await page.goto(`/board/${boardId}`);

    const registrationLink = page.getByRole('link', { name: '발표 주제 등록하기' });
    await expect(registrationLink).toBeVisible({ timeout: 15_000 });
    await registrationLink.click();

    await expect(page).toHaveURL(new RegExp(`/board/${boardId}/topic`));

    const topicInput = page.getByPlaceholder('발표 주제를 입력해주세요');
    await expect(topicInput).toBeVisible({ timeout: 10_000 });
    await topicInput.fill('나의 발표 주제입니다');

    await page.getByRole('button', { name: '등록하기' }).click();

    await expect(page.getByText('등록 완료!')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('나의 발표 주제입니다')).toBeVisible();
  });

  test('T.17 Already-registered member views topic page → info state shown, no form', async ({
    page,
  }) => {
    // REGULAR already has an entry; SECOND is the assigned presenter
    await createTopicMission(boardId, REGULAR_USER_ID, '이미 등록한 주제', 'pending');
    await createTopicMission(boardId, SECOND_USER_ID, '현재 발표자 주제', 'assigned');

    await page.goto(`/board/${boardId}/topic`);

    await expect(page.getByText('이미 등록하셨습니다')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('이미 등록한 주제')).toBeVisible();
    await expect(page.getByPlaceholder('발표 주제를 입력해주세요')).not.toBeVisible();
  });

  test('T.18 Assigned presenter views board → personalised banner shown', async ({ page }) => {
    // REGULAR is the assigned presenter
    await createTopicMission(boardId, REGULAR_USER_ID, '내 발표 주제', 'assigned');

    await page.goto(`/board/${boardId}`);

    await expect(page.getByText('당신이 다음 발표자입니다')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('내 발표 주제')).toBeVisible();
    // Registration link must NOT appear for the presenter
    await expect(page.getByRole('link', { name: '발표 주제 등록하기' })).not.toBeVisible();
  });

  test('T.19 Board with no assigned presenter → banner not rendered', async ({ page }) => {
    // Only a pending entry — no assigned
    await createTopicMission(boardId, REGULAR_USER_ID, 'Pending Topic', 'pending');

    await page.goto(`/board/${boardId}`);
    // Wait for board content to load before asserting absence
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('발표 주제 등록하기')).not.toBeVisible();
    await expect(page.getByText('당신이 다음 발표자입니다')).not.toBeVisible();
  });
});
