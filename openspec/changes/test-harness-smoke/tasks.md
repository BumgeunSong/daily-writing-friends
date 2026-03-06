## 1. Text Truncation Utility

- [x] 1.1 Create `src/utils/textHelpers.ts` with `truncateText(text: string, maxLength: number): string` function that returns original text if within limit, or truncated text with "..." suffix if over limit. Handle edge cases: empty string, maxLength < 4.
- [x] 1.2 Ensure the file compiles cleanly with `npx tsc --noEmit`.

## 2. Unit Tests

- [ ] 2.1 Create `src/utils/__tests__/textHelpers.test.ts` with Vitest tests covering: empty string, short text (no truncation), exact length, over length with "...", very short maxLength (< 4).
- [ ] 2.2 Run `npx vitest run src/utils/__tests__/textHelpers.test.ts` and verify all tests pass.

## Tests

### Unit
- [ ] T.1 truncateText unit tests covering S1-S5 scenarios (Vitest)
