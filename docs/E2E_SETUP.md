# Firebase Emulator E2E Testing Setup

This document explains how to use Firebase emulators for E2E testing with Playwright, bypassing Google OAuth for fast, reliable, and hermetic tests.

## 🎯 Overview

This setup provides:
- **Fast authentication**: No external OAuth flows
- **Hermetic testing**: Isolated emulator environment 
- **Deterministic data**: Seeded test users and data
- **Flexible auth strategies**: Email/password and custom tokens
- **CI/CD ready**: Automated setup and teardown

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development with Emulators
```bash
# Start both Vite dev server and Firebase emulators
npm run dev:emu
```

### 3. Run E2E Tests
```bash
# Run all E2E tests
npm run e2e

# Run with UI
npm run e2e:ui

# Run in headed mode (see browser)
npm run e2e:headed

# Debug mode
npm run e2e:debug
```

## 🛠 Setup Details

### Environment Configuration

The setup uses environment-specific configuration files:

- **`config/.env.example`**: Template for local development
- **`config/.env.e2e`**: E2E test configuration with emulator settings
- **`.env`**: Your local development settings (not tracked)

Key environment variables:
```bash
VITE_USE_EMULATORS=true  # Enable emulator mode
VITE_EMULATOR_AUTH_HOST=localhost
VITE_EMULATOR_AUTH_PORT=9099
VITE_EMULATOR_FIRESTORE_HOST=localhost  
VITE_EMULATOR_FIRESTORE_PORT=8080
VITE_EMULATOR_STORAGE_HOST=localhost
VITE_EMULATOR_STORAGE_PORT=9199
```

### Firebase Client Configuration

The `src/firebase.ts` file automatically detects emulator mode and connects to local emulators when `VITE_USE_EMULATORS=true`:

```typescript
// Emulator connections are established automatically
// - Auth: localhost:9099
// - Firestore: localhost:8080  
// - Storage: localhost:9199
// - Functions: localhost:5001
```

### Test Users

The setup creates these test users automatically:

| Email | Password | Role | UID |
|-------|----------|------|-----|
| `e2e@example.com` | `test1234` | user | `e2e-user-1` |
| `e2e2@example.com` | `test1234` | user | `e2e-user-2` | 
| `admin@example.com` | `admin1234` | admin | `e2e-admin` |

## 📝 Writing Tests

### Basic Test with Authentication

```typescript
import { test, expect } from './fixtures/auth';

test('should access protected feature', async ({ page }) => {
  // User is automatically authenticated via storageState
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### Test with Different User

```typescript
import { test, expect, AuthUtils, TEST_USERS } from './fixtures/auth';

test('should work with admin user', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.locator('[data-testid="admin-panel"]')).toBeVisible();
});
```

### Test User Switching

```typescript
test('should handle user switching', async ({ loggedOutPage }) => {
  // Start logged out
  let isSignedIn = await AuthUtils.isSignedIn(loggedOutPage);
  expect(isSignedIn).toBe(false);
  
  // Sign in as specific user
  await AuthUtils.signInWithEmail(
    loggedOutPage, 
    TEST_USERS.SECOND.email, 
    TEST_USERS.SECOND.password
  );
  
  isSignedIn = await AuthUtils.isSignedIn(loggedOutPage);
  expect(isSignedIn).toBe(true);
});
```

### Test Unauthenticated Scenarios

```typescript
test('should redirect to login', async ({ loggedOutPage }) => {
  await loggedOutPage.goto('/protected-route');
  await expect(loggedOutPage).toHaveURL('/login');
});
```

## 🔧 Available Scripts

### Development
```bash
npm run dev:emu          # Start dev server + emulators
npm run emu:start        # Start emulators only
npm run emu:start:clean  # Start emulators without data import
npm run emu:stop         # Stop emulators
npm run emu:clear        # Stop emulators and clear data
npm run emu:seed         # Seed emulators with test data
```

### Testing
```bash
npm run e2e              # Run E2E tests
npm run e2e:ui           # Run E2E tests with UI
npm run e2e:headed       # Run E2E tests in headed mode
npm run e2e:debug        # Run E2E tests in debug mode
npm run e2e:setup        # Setup emulators for E2E
npm run e2e:teardown     # Teardown emulators after E2E
```

## 📁 Project Structure

```
├── config/
│   ├── .env.example          # Environment template
│   └── .env.e2e              # E2E test environment
├── firebase/
│   ├── firestore.rules       # Production Firestore rules
│   ├── firestore.test.rules  # Permissive test rules
│   ├── storage.rules         # Production Storage rules
│   └── storage.test.rules    # Permissive test rules
├── firebase.json             # Firebase config with emulators
├── public/
│   └── __e2e-login.html     # E2E login helper page
├── scripts/
│   ├── seed-auth-emulator.js # Auth emulator seeding
│   └── setup-emulator-rules.js
├── src/
│   └── firebase.ts          # Firebase config with emulator support
└── tests/
    ├── fixtures/
    │   ├── auth.ts          # Auth test fixtures
    │   └── auth-tokens.json # Generated custom tokens
    ├── global-setup.ts      # Playwright global setup
    ├── global-teardown.ts   # Playwright global teardown
    ├── auth.setup.ts        # Auth setup for tests
    ├── auth.teardown.ts     # Auth cleanup
    └── example-auth.spec.ts # Example tests
```

## 🔐 Authentication Strategies

### 1. Email/Password (Default)
- Realistic user flow
- Tests actual login UI
- Slower but more thorough

```typescript
await AuthUtils.signInWithEmail(page, 'e2e@example.com', 'test1234');
```

### 2. Custom Tokens (Fast)
- Bypasses UI login flow  
- Faster test execution
- Direct authentication

```typescript
const tokens = await import('./fixtures/auth-tokens.json');
await AuthUtils.signInWithToken(page, tokens['e2e-user-1']);
```

### 3. Storage State (Fastest)
- Reuses authenticated session
- No authentication per test
- Shared across all tests

```typescript
// Automatically applied via playwright.config.ts storageState
```

## 🎛 Configuration Options

### Playwright Configuration

Key settings in `playwright.config.ts`:

```typescript
// Base URL for your app
baseURL: 'http://localhost:5173'

// Storage state for authentication
storageState: './tests/storageState.auth.json'

// Web server with emulator environment
webServer: {
  command: 'cross-env VITE_USE_EMULATORS=true vite --mode e2e',
  env: { VITE_USE_EMULATORS: 'true' }
}
```

### Firebase Emulator Configuration

Settings in `firebase.json`:

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "functions": { "port": 5001 }
  }
}
```

## 🐛 Troubleshooting

### Emulators Not Starting
```bash
# Check if ports are in use
lsof -i :9099 -i :8080 -i :9199

# Kill processes on ports
kill -9 $(lsof -t -i:9099)

# Clear emulator data
npm run emu:clear
```

### Authentication Failing
```bash
# Re-seed test users
npm run emu:seed

# Check emulator logs
firebase emulators:start --debug
```

### Tests Hanging
```bash
# Check if dev server is running
curl http://localhost:5173

# Restart with clean state
npm run emu:clear && npm run dev:emu
```

### Storage State Issues
```bash
# Delete and regenerate auth state
rm tests/storageState.auth.json
npm run e2e -- tests/auth.setup.ts
```

## 🚨 Security Notes

### Test vs Production Rules

The setup uses different security rules for testing:

- **Production**: `firebase/firestore.rules`, `firebase/storage.rules` (strict)
- **Testing**: `firebase/firestore.test.rules`, `firebase/storage.test.rules` (permissive)

⚠️ **Never deploy test rules to production!**

### Test User Identification

Test users are marked with `testUser: true` claims and can be filtered in production if needed.

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E tests
  run: |
    npm run e2e:setup &
    sleep 10
    npm run e2e
    npm run e2e:teardown
  env:
    CI: true
```

### Environment Variables for CI

Set these in your CI environment:
```bash
VITE_USE_EMULATORS=true
NODE_ENV=test
```

## 📚 Additional Resources

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Firebase Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)

## 🤝 Contributing

When adding new tests:

1. Use the auth fixtures from `tests/fixtures/auth.ts`
2. Follow the existing authentication patterns
3. Test both authenticated and unauthenticated scenarios
4. Update this documentation for new features

---

Happy testing! 🎉