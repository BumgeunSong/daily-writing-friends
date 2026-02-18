# AGENTS.md

This file provides guidance for AI coding agents (Claude, GitHub Copilot, etc.) working with this repository.

## Project Overview

**Daily Writing Friends** - A React web application that helps users develop daily writing habits. Built with Vite, TypeScript, React 18, Firebase (Firestore, Auth, Cloud Functions), and Tailwind CSS.

| Component | Technology | Location |
|-----------|------------|----------|
| Frontend | React 18, Vite, TypeScript | `/src` |
| Cloud Functions | Node 22, TypeScript, Jest | `/functions` |
| Styling | Tailwind CSS 3.x | `tailwind.config.js` |
| State | React Query v4 | - |
| Testing | Vitest (frontend), Jest (functions) | - |

## Build & Validation Commands

**Always run these commands from the repository root unless specified.**

### Frontend (Root Directory)

```bash
# Install dependencies (always run first after checkout)
npm install

# Type check - ALWAYS run before committing
npm run type-check

# Lint - run to check for issues
npm run lint

# Unit tests - REQUIRED to pass
npm run test:run

# Production build - verifies build success
npm run build
```

### Runtime Verification (Agent Observability)

```bash
# Check for runtime errors in dev logs (exit code 1 if errors found)
npm run devlog:check

# View recent log events
npm run devlog

# View only errors and warnings
npm run devlog:errors
```

Log files: `.logs/dev-*.jsonl` — structured JSON, one event per line. Auto-generated during dev server runs.

### Firebase Functions (`/functions` directory)

```bash
# Install dependencies - required separately
cd functions && npm install

# Build functions - compiles TypeScript
cd functions && npm run build

# Run tests - REQUIRED to pass
cd functions && npm test
```

### Running TypeScript Scripts

This project uses **ESM modules** (`"type": "module"` in package.json). Use `tsx` instead of `ts-node`:

```bash
# ✅ CORRECT - use tsx for ESM compatibility
npx tsx scripts/migration/export-firestore.ts

# ❌ WRONG - ts-node fails with ESM modules
npx ts-node scripts/migration/export-firestore.ts
# Error: Unknown file extension ".ts"
```

**Why:** `ts-node` requires additional configuration for ESM. `tsx` works out of the box with ESM modules.

## CI/CD Pipeline

Pull requests trigger these checks automatically:
1. **Vitest** (`run-vitest.yml`): Runs `npm run test:run --coverage` on Node 20.x
2. **Firebase Hosting** (`firebase-hosting-merge.yml`): Builds and deploys on merge to `main`

**Before submitting PR, ensure:**
- `npm run type-check` passes
- `npm run test:run` passes
- `npm run build` completes successfully
- `npm run devlog:check` passes (after exercising changed data-flow code)
- For functions changes: `cd functions && npm test` passes

## Project Architecture

### Feature-Based Directory Structure

```
src/
├── <feature>/           # board, comment, draft, login, notification, post, stats, user
│   ├── api/            # Firebase/data fetching functions
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── model/          # TypeScript types
│   └── utils/          # Feature-specific utilities
├── shared/             # Cross-feature utilities
│   ├── api/           # Shared API utilities
│   ├── components/    # Shared React components
│   ├── contexts/      # React contexts
│   ├── hooks/         # Shared hooks
│   ├── lib/           # Library configurations (queryClient)
│   ├── model/         # Shared types
│   ├── ui/            # shadcn/ui components
│   └── utils/         # Shared utilities
├── firebase/          # Firebase configuration
└── firebase.ts        # Firebase initialization
```

### Path Aliases

Use these import aliases (configured in `tsconfig.json` and `vite.config.ts`):

```typescript
import { Component } from '@/shared/components/Component';
import { useHook } from '@board/hooks/useHook';
import { Post } from '@post/model/Post';
// Available: @/, @board/, @post/, @comment/, @draft/, @notification/, @user/, @shared/, @login/, @stats/
```

### Functions Directory Structure

```
functions/
├── src/
│   ├── index.ts              # Function exports
│   ├── backfill/             # Data migration scripts
│   ├── commentSuggestion/    # AI comment features
│   ├── commentings/          # Comment activity tracking
│   ├── eventSourcing/        # Event sourcing logic
│   ├── notifications/        # Push notification functions
│   ├── postings/             # Post activity tracking
│   ├── replyings/            # Reply activity tracking
│   ├── shared/               # Shared utilities
│   └── test/                 # Test utilities
├── tsconfig.json             # Separate TS config (Node target)
└── package.json              # Separate dependencies (Node 22)
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.eslintrc.json` | ESLint rules (TypeScript, React, Tailwind) |
| `.prettierrc` | Code formatting (single quotes, 100 print width) |
| `tsconfig.json` | TypeScript config with path aliases |
| `vite.config.ts` | Vite build config, path aliases, Vitest |
| `firebase.json` | Firebase hosting, functions, emulator config |
| `tailwind.config.js` | Tailwind CSS configuration |

## Environment Setup

Copy `config/.env.example` to `.env` at root and configure Firebase credentials. Build requires:
- `VITE_FIREBASE_*` variables for Firebase config
- `SENTRY_AUTH_TOKEN` (optional) for error tracking

---

## Code Writing Practices

**Skills** (auto-activated):
- `code-style` - Naming, comments, function design principles
- `react-component` - Component structure, import order, hooks patterns
- `api-layer` - API functions, Firestore patterns

### React Hook Callback Stability

When passing callbacks to custom hooks, always wrap in `useCallback`:

```tsx
// ❌ BAD - creates new function every render, breaks memoization chains
const { handler } = useCustomHook({
  onComplete: (result) => doSomething(result)
});

// ✅ GOOD - stable reference
const onComplete = useCallback((result) => doSomething(result), []);
const { handler } = useCustomHook({ onComplete });
```

**Why:** Inline callbacks break memoization chains. If the hook uses the callback in `useMemo` or `useCallback`, an unstable reference causes cascading re-renders.

---

## Database Schema Reference

### Core Collections

- **users**: User profiles with subcollections for notifications, writing histories, postings, commentings, replyings
- **boards**: Writing cohorts with posts subcollection, each post has comments subcollection with replies

### Key Data Patterns

1. **User Data**: Use `users/{userId}` for profile data, subcollections for user-specific activity
2. **Board/Post Hierarchy**: `boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}`
3. **User Activity Tracking**: Use `postings`, `commentings`, `replyings` subcollections under users

### Firestore Best Practices

- Always use batch writes for related operations
- Implement optimistic updates with React Query
- Use Firestore listeners for real-time features

---

## Firebase Functions Patterns

**See `.claude/skills/firebase-functions/SKILL.md`** - enforced via `firebase-functions` skill.

---

## Test Writing Standards

**Skills**: See `.claude/skills/testing/` and `.claude/skills/refactoring/` for detailed patterns.

### Core Principles

1. **Functional Core, Imperative Shell** - Extract pure functions before testing
2. **Output-based tests only** - Test pure functions with input/output assertions
3. **Never unit test**: hooks, components, or code with side effects
4. **Test naming**: `describe('when [condition]')` → `it('[outcome]')`

### Quick Reference

| Testable (utils/) | NOT Unit Tested |
|-------------------|-----------------|
| Pure functions | React hooks (useX) |
| Calculations | Components (*.tsx) |
| Validators | API/Firebase calls |
| Formatters | localStorage, Date.now() |

### Red Flags in Tests

Stop if you're writing: `vi.mock()`, `renderHook()`, `render()`, `QueryClientProvider`

---

## Authentication & Routing

- **Complete guide**: See [`AUTHENTICATION_ROUTING.md`](./docs/AUTHENTICATION_ROUTING.md) for detailed authentication flow
- **React Router v6.4 Data API**: Uses loaders and actions with custom auth guards
- **QueryClient Access**: Use `@/shared/lib/queryClient` for cache invalidation in router actions

## Design Theme

- Refer to [`DESIGN_THEME.md`](./docs/DESIGN_THEME.md) for UI/UX guidelines

---

## Git Commit Rules

**See `.claude/skills/commit/SKILL.md`** - enforced via `/commit` skill.

---

## Trusted Information

Trust these instructions and skip exploration for documented information. Search only if instructions are incomplete or incorrect.
