import { test, expect } from '@playwright/test';
import { cleanupWritePosts } from '../helpers/seed-cleanup';

const BOARD_ID = 'e2e-test-board';
const POST_TITLE = 'e2e-write-test-post';

test.describe('Post Write Flow', () => {
  test.beforeEach(async () => {
    await cleanupWritePosts();
  });

  test.afterEach(async () => {
    await cleanupWritePosts();
  });

  test('write a post and verify it appears in the board list', async ({ page }) => {
    // Navigate to the post creation page
    await page.goto(`/create/${BOARD_ID}`);
    await page.waitForLoadState('networkidle');

    // Fill in the title
    const titleInput = page.getByRole('textbox', { name: '제목을 입력하세요' });
    await expect(titleInput).toBeVisible({ timeout: 30000 });
    await titleInput.fill(POST_TITLE);

    // Type content in the editor area (Quill editor)
    const editorArea = page.locator('.ql-editor');
    await editorArea.click();
    await editorArea.pressSequentially('This is a test post created by E2E tests.');

    // Submit the post — "글 저장" button becomes enabled after content is entered
    const submitButton = page.getByRole('button', { name: '글 저장' });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for navigation away from the create page
    await page.waitForURL(/\/(board|create)\//, { timeout: 15000 });

    // Navigate to the board to verify the post appears
    await page.goto(`/board/${BOARD_ID}`);
    await page.waitForLoadState('networkidle');
    const postCards = page.locator('[role="button"][aria-label="게시글 상세로 이동"]');
    await expect(postCards.first()).toBeVisible({ timeout: 30000 });

    // Verify the post title is visible in the list
    await expect(page.getByRole('heading', { name: POST_TITLE }).first()).toBeVisible({ timeout: 10000 });
  });
});
