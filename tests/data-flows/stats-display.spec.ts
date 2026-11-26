import { test, expect } from '@playwright/test';

test.describe('기록 페이지', () => {
  test('로그인한 멤버의 기록 카드가 이름과 함께 보인다', async ({ page }) => {
    await page.goto('/stats');

    await expect(page.getByText('기록', { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'E2E Test User', exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('문제가 생겼')).toHaveCount(0);
  });

  test('댓글·답글 탭을 누르면 그 탭이 선택된다', async ({ page }) => {
    await page.goto('/stats');
    await expect(page.getByRole('heading', { name: 'E2E Test User', exact: true })).toBeVisible({ timeout: 30000 });

    await page.getByRole('tab', { name: /댓글·답글/ }).click();

    await expect(page.getByRole('tab', { name: /댓글·답글/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: '글쓰기' })).toHaveAttribute('aria-selected', 'false');
  });
});
