import { test, expect } from '@playwright/test';
import { clearMailpitInbox, readLatestOtpForEmail } from './utils/inbucket';

/**
 * T.8 — OTP signup happy path.
 *
 * Sign up new email/password → read OTP from Mailpit → enter on /verify-email
 * → land on /join/onboarding.
 *
 * Prereqs:
 *   - Local Supabase running (`npm run supabase:start`).
 *   - Dev server running on port 5173 (`npm run dev:e2e`).
 *   - `enable_confirmations = true` in supabase/config.toml.
 */
test.describe('OTP signup happy path', () => {
  test('new email signup arrives at /join/onboarding after OTP verify', async ({ page }) => {
    await clearMailpitInbox();

    const email = `e2e-otp-${Date.now()}@example.com`;
    const password = 'StrongPass-2026!';

    await page.goto('/signup');
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호', { exact: true }).fill(password);
    await page.getByLabel('비밀번호 확인').fill(password);
    await page.getByRole('button', { name: /^회원가입$/ }).click();

    // Land on /verify-email with email visible.
    await expect(page).toHaveURL(/\/verify-email$/);
    await expect(page.getByText(email)).toBeVisible();

    // Read OTP from Mailpit.
    const code = await readLatestOtpForEmail(email, { timeoutMs: 15_000 });
    expect(code).toMatch(/^\d{6}$/);

    // Enter the OTP.
    await page.getByLabel('인증 코드').fill(code);
    await page.getByRole('button', { name: '인증 확인' }).click();

    // Land on /join/onboarding.
    await page.waitForURL(/\/join\/onboarding$/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/join\/onboarding$/);
  });
});
