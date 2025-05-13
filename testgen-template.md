You are a Vitest + React Testing Library expert. Generate a test file for the given React component that:
- Uses TypeScript and Vitest (no snapshots).
- All functions, variables, mocks, and test code must have explicit TypeScript type annotations where possible.
- Imports via project path aliases.
- Wraps rendering in `renderWithProviders` from `src/test/utils/renderWithProviders`.
- Mocks unsupported dependencies (e.g. Sentry, analytics) so that all such imports return void or empty.
- For data fetching, **mock only the fetch function (e.g. fetchBoardsWithUserPermissions) using vi.mock**. Do NOT use `useQuery.mockReturnValue` (see TanStack Query official testing guide).
- Use async matchers like `findByText` for async data.
- **Always mock all external dependencies (such as firebase.ts, remoteConfig, useRemoteConfig, etc.) using vi.mock at the very top of the test file, before any imports. This ensures no real network or browser APIs are called.**
- Connects to Firebase Local Emulator Suite based on the `USE_FIREBASE_EMULATOR` flag. (Firebase Storage, Realtime Database, Cloud Functions는 테스트하지 않음)
- Focuses on:
  1. React Query data-fetching states (loading, success, error)
  2. Edge cases and prop variations
  3. Core interactions (clicks, form submits)
- Does NOT include UI styling or accessibility tests.
- For each test, add a comment explaining why the test is needed.
- Place output as `test/Component.test.tsx` next to the component file.
- At the end, output a summary: "총 N개의 테스트가 생성되었습니다."

---

**Example (official style):**

```tsx
// Always mock external dependencies before any imports!
vi.mock('@/firebase', () => ({
  remoteConfig: { settings: {}, defaultConfig: {} },
}));
vi.mock('@shared/hooks/useRemoteConfig', () => ({
  useRemoteConfig: <T,>(key: string, defaultValue: T) => ({
    value: defaultValue,
    isLoading: false,
    error: null,
    refetch: async () => {},
  }),
}));

import { renderWithProviders } from '@/test/utils/renderWithProviders';
import MyComponent from '@/features/myFeature/MyComponent';
import { vi, describe, it, expect, Mock } from 'vitest';
import { fetchData } from '@/features/myFeature/api';

vi.mock('@/features/myFeature/api', () => ({
  fetchData: vi.fn(),
}));

describe('MyComponent', () => {
  it('renders loading state', () => {
    // ...
  });

  it('renders error state', async () => {
    (fetchData as unknown as Mock).mockImplementationOnce(() => { throw new Error('error'); });
    const { findByText } = renderWithProviders(<MyComponent />);
    expect(await findByText(/에러/)).toBeInTheDocument();
  });

  it('renders data', async () => {
    (fetchData as unknown as Mock).mockResolvedValueOnce([{ id: 1, name: 'Test' }]);
    const { findByText } = renderWithProviders(<MyComponent />);
    expect(await findByText(/Test/)).toBeInTheDocument();
  });
});
```

```tsx
[PASTE COMPONENT CODE HERE]
```