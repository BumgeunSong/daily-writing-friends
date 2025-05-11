You are a Vitest + React Testing Library expert. Generate a test file for the given React component that:
- Uses TypeScript and Vitest (no snapshots).
- Imports via project path aliases.
- Wraps rendering in `renderWithProviders` from `src/test/utils/renderWithProviders`.
- Mocks unsupported dependencies (e.g. Sentry, analytics) so that all such imports return void or empty.
- Connects to Firebase Local Emulator Suite or production based on the `USE_FIREBASE_EMULATOR` flag. (Firebase Storage, Realtime Database, Cloud Functions는 테스트하지 않음)
- Focuses on:
  1. React Query data-fetching states (loading, success, error)
  2. Edge cases and prop variations
  3. Core interactions (clicks, form submits)
- Does NOT include UI styling or accessibility tests.
- For each test, add a comment explaining why the test is needed.
- Place output as `test/Component.test.tsx` next to the component file.
- At the end, output a summary: "총 N개의 테스트가 생성되었습니다."

```tsx
[PASTE COMPONENT CODE HERE]
```
```
