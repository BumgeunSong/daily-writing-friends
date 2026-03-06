## Why

The codebase has no shared text utility for truncating long strings. Multiple components duplicate inline truncation logic. A shared helper reduces duplication and ensures consistent "..." behavior.

## What Changes

- Add `src/utils/textHelpers.ts` with a `truncateText()` function
- Add unit tests for the utility

## Capabilities

### New Capabilities
- **text-truncation**: A shared text truncation utility (`specs/text-truncation/spec.md`)

### Modified Capabilities
None.

## Impact

- New file: `src/utils/textHelpers.ts`
- New file: `src/utils/__tests__/textHelpers.test.ts`
- No breaking changes, no API changes, no dependency changes
