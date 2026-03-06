## Design

### Decision D1: Function Signature

`truncateText(text: string, maxLength: number): string`

- Returns original text if `text.length <= maxLength`
- Returns `text.slice(0, maxLength - 3) + "..."` if longer
- Edge cases: empty string returns empty, maxLength < 4 returns text.slice(0, maxLength)

### Decision D2: File Location

`src/utils/textHelpers.ts` — follows existing project convention of utils/ for shared helpers.

### Testability Notes

- Unit tests via Vitest in `src/utils/__tests__/textHelpers.test.ts`
- No integration or E2E tests needed for a pure function
