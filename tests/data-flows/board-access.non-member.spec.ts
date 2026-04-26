import { test, expect } from '@playwright/test';

const BOARD_ID = 'e2e-test-board';

test.describe('Board Access Control', () => {
  test('non-member sees error page when accessing board', async ({ page }) => {
    // Navigate to the board as a non-member user (e2e2@, no board membership)
    await page.goto(`/board/${BOARD_ID}`);
    await page.waitForLoadState('networkidle');

    // The PermissionErrorBoundary should show "읽기 권한 없음" dialog
    await expect(
      page.getByText(/읽기 권한 없음|권한이 없|접근할 수 없/i),
    ).toBeVisible({ timeout: 10000 });

    // The board content (post list) should NOT be visible
    const postLinks = page.locator('[role="button"][aria-label="게시글 상세로 이동"]');
    await expect(postLinks).toHaveCount(0);
  });
});
