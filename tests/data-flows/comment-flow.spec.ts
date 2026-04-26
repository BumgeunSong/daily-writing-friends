import { test, expect } from '@playwright/test';
import { cleanupWriteComments } from '../helpers/seed-cleanup';

const BOARD_ID = 'e2e-test-board';
const POST_ID = 'e2e-post-000';
const COMMENT_TEXT = 'e2e-write-test-comment';

test.describe('Comment Flow', () => {
  test.beforeEach(async () => {
    await cleanupWriteComments();
  });

  test.afterEach(async () => {
    await cleanupWriteComments();
  });

  test('write a comment and verify it appears', async ({ page }) => {
    // Navigate to the seeded post's detail page
    await page.goto(`/board/${BOARD_ID}/post/${POST_ID}`);
    await page.waitForLoadState('networkidle');

    // Wait for the post detail to render
    await expect(page.getByRole('heading', { name: 'E2E Seeded Post 1' })).toBeVisible({ timeout: 30000 });

    // Find the comment input textbox
    const commentInput = page.getByRole('textbox', { name: /댓글|글값/ });
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.fill(COMMENT_TEXT);

    // Submit the comment — the button next to the textbox
    const submitButton = commentInput.locator('..').locator('button');
    await submitButton.click();

    // Verify the comment appears in the comment section
    await expect(page.getByText(COMMENT_TEXT)).toBeVisible({ timeout: 10000 });
  });
});
