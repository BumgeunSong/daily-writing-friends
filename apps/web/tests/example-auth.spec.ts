import { test, expect, AuthUtils, TEST_USERS } from './fixtures/auth';

/**
 * Example E2E tests demonstrating Firebase emulator authentication
 * 
 * These tests show how to use the authentication fixtures and utilities
 * to test your app with different user scenarios.
 */

test.describe('Authentication Examples', () => {
  test('should be authenticated by default', async ({ page }) => {
    // This test uses the default storageState from auth.setup.ts
    await page.goto('/');
    
    // Check if user is signed in (adjust selector based on your app)
    const isSignedIn = await AuthUtils.isSignedIn(page);
    expect(isSignedIn).toBe(true);
    
    const userId = await AuthUtils.getCurrentUserId(page);
    expect(userId).toBe(TEST_USERS.REGULAR.uid);
  });

  test('should work with logged out user', async ({ loggedOutPage }) => {
    // This test uses a fresh context with no authentication
    const isSignedIn = await AuthUtils.isSignedIn(loggedOutPage);
    expect(isSignedIn).toBe(false);
    
    // Navigate to your app and verify logged-out state
    await loggedOutPage.goto('/');
    // Add assertions for logged-out UI state
  });

  test('should work with admin user', async ({ adminPage }) => {
    // This test uses admin authentication
    const isSignedIn = await AuthUtils.isSignedIn(adminPage);
    expect(isSignedIn).toBe(true);
    
    const userId = await AuthUtils.getCurrentUserId(adminPage);
    expect(userId).toBe(TEST_USERS.ADMIN.uid);
    
    // Navigate to admin features and test them
    await adminPage.goto('/');
    // Add assertions for admin UI features
  });

  test('should handle user switching', async ({ loggedOutPage }) => {
    // Start logged out
    let isSignedIn = await AuthUtils.isSignedIn(loggedOutPage);
    expect(isSignedIn).toBe(false);
    
    // Sign in as regular user
    await AuthUtils.signInWithEmail(
      loggedOutPage, 
      TEST_USERS.REGULAR.email, 
      TEST_USERS.REGULAR.password
    );
    
    isSignedIn = await AuthUtils.isSignedIn(loggedOutPage);
    expect(isSignedIn).toBe(true);
    
    let userId = await AuthUtils.getCurrentUserId(loggedOutPage);
    expect(userId).toBe(TEST_USERS.REGULAR.uid);
    
    // Sign out
    await AuthUtils.signOut(loggedOutPage);
    isSignedIn = await AuthUtils.isSignedIn(loggedOutPage);
    expect(isSignedIn).toBe(false);
    
    // Sign in as different user
    await AuthUtils.signInWithEmail(
      loggedOutPage,
      TEST_USERS.SECOND.email,
      TEST_USERS.SECOND.password
    );
    
    isSignedIn = await AuthUtils.isSignedIn(loggedOutPage);
    expect(isSignedIn).toBe(true);
    
    userId = await AuthUtils.getCurrentUserId(loggedOutPage);
    expect(userId).toBe(TEST_USERS.SECOND.uid);
  });
});

test.describe('App functionality with authentication', () => {
  test('should access protected pages when authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to protected routes and verify access
    // Adjust these based on your app's routes
    // await page.goto('/dashboard');
    // await expect(page.locator('h1')).toContainText('Dashboard');
    
    // await page.goto('/profile');
    // await expect(page.locator('h1')).toContainText('Profile');
  });

  test('should handle Firebase operations', async ({ page }) => {
    await page.goto('/');
    
    // Test Firebase operations like creating posts, reading data, etc.
    // These will work with the emulator and test data
    
    // Example: Test creating a post
    // await page.click('[data-testid=\"create-post-button\"]');
    // await page.fill('[data-testid=\"post-title\"]', 'Test Post Title');
    // await page.fill('[data-testid=\"post-content\"]', 'This is test content');
    // await page.click('[data-testid=\"submit-post\"]');
    
    // Verify post was created
    // await expect(page.locator('[data-testid=\"post-list\"]')).toContainText('Test Post Title');
  });

  test('should redirect unauthenticated users', async ({ loggedOutPage }) => {
    // Test that protected routes redirect to login
    // await loggedOutPage.goto('/dashboard');
    // await expect(loggedOutPage).toHaveURL('/login');
    
    // Or verify login prompt is shown
    // await expect(loggedOutPage.locator('[data-testid=\"login-prompt\"]')).toBeVisible();
  });
});