import { test, expect } from '@playwright/test';

/**
 * Auth flow smoke test.
 * Verifies unauthenticated routing behavior without requiring OAuth credentials.
 */
test.describe('Auth Flow', () => {
  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('구글로 로그인하기')).toBeVisible();
  });

  test('login button is clickable and not disabled', async ({ page }) => {
    await page.goto('/login');
    const loginButton = page.getByText('구글로 로그인하기');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
  });

  test('unauthenticated user cannot access protected routes', async ({ page }) => {
    await page.goto('/board');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
