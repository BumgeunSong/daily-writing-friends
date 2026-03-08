import { test, expect } from '@playwright/test';

/**
 * Auth flow smoke test.
 * Verifies unauthenticated routing behavior without requiring OAuth credentials.
 */
test.describe('Auth Flow', () => {
  test('unauthenticated root redirects to join page', async ({ page }) => {
    await page.goto('/');
    // RootRedirect sends unauthenticated users to /join
    await expect(page).toHaveURL(/\/join/);
  });

  test('login page shows Google login button', async ({ page }) => {
    await page.goto('/login');
    const loginButton = page.getByText('구글로 로그인하기');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
  });

  test('unauthenticated user cannot access protected routes', async ({ page }) => {
    await page.goto('/boards');
    // PrivateRoutes redirects to /login when not authenticated
    await expect(page).toHaveURL(/\/login/);
  });
});
