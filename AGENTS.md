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

### Firebase Functions (`/functions` directory)

```bash
# Install dependencies - required separately
cd functions && npm install

# Build functions - compiles TypeScript
cd functions && npm run build

# Run tests - REQUIRED to pass
cd functions && npm test
```

## CI/CD Pipeline

Pull requests trigger these checks automatically:
1. **Vitest** (`run-vitest.yml`): Runs `npm run test:run --coverage` on Node 20.x
2. **Firebase Hosting** (`firebase-hosting-merge.yml`): Builds and deploys on merge to `main`

**Before submitting PR, ensure:**
- `npm run type-check` passes
- `npm run test:run` passes
- `npm run build` completes successfully
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

### Self-Documenting Code Through Expressive Naming

**Core Principle: Code should be self-explanatory through clear naming, not through comments**

#### Guidelines for Expressive Naming

1. **Replace Comments with Descriptive Names**
   - ❌ `const d = 7; // days in recovery period`
   - ✅ `const daysInRecoveryPeriod = 7;`

2. **Avoid Abbreviations**
   - ❌ `getUserCmt()`, `calcRecReq()`
   - ✅ `getUserComment()`, `calculateRecoveryRequirement()`

3. **Use Long Names When Needed**
   - ❌ `isValid()`, `check()`
   - ✅ `isUserEligibleForRecovery()`, `checkIfPostMeetsRequirements()`

4. **Use Intermediate Variables with Descriptive Names**
   ```typescript
   // ✅ Self-explanatory with intermediate variables
   const hasRequiredPostCount = posts.length >= 2;
   const isWithinRecoveryWindow = new Date() <= recoveryDeadline;
   const canStartRecovery = hasRequiredPostCount && isWithinRecoveryWindow;
   ```

5. **Extract Magic Numbers into Named Constants**
   - ✅ `const GOLD_BADGE_STREAK_THRESHOLD = 21;`

6. **Boolean Variables Should Read Like Questions**
   - ❌ `eligible`, `recovery`
   - ✅ `isEligible`, `isRecovering`, `hasPassedDeadline`

7. **Collections Should Use Plural Names**
   - ❌ `const post = getPosts()`
   - ✅ `const posts = getPosts()`

### Code Comments Best Practices

**Core Principle: Code tells you HOW, Comments tell you WHY**

- Comments should provide additional insight, not restate what's already clear
- Use `TODO:` comments to highlight known limitations
- Update comments when changing code
- Remove obsolete comments

### Component Structure

Follow this pattern for all React components:

```typescript
// 1. External imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal shared imports
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/shared/hooks/useAuth';

// 3. Feature-specific imports
import { usePostEditor } from '../hooks/usePostEditor';

// 4. Component definition with TypeScript
interface PostEditorProps {
  boardId: string;
  initialContent?: string;
}

export function PostEditor({ boardId, initialContent }: PostEditorProps) {
  // Component logic
}
```

### API Layer Pattern

All API functions should be in `[feature]/api/`:

```typescript
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Post } from '../model/Post';

export async function createPost(
  boardId: string,
  postData: Omit<Post, 'id' | 'createdAt'>,
): Promise<Post> {
  const postsRef = collection(db, 'boards', boardId, 'posts');
  const docRef = await addDoc(postsRef, {
    ...postData,
    createdAt: new Date(),
  });
  return { ...postData, id: docRef.id, createdAt: new Date() };
}
```

### Custom Hooks Pattern

Place business logic in custom hooks in `[feature]/hooks/`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPost } from '../api/post';

export function usePostEditor(boardId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreatePostData) => createPost(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', boardId] });
    },
  });

  return { createMutation };
}
```

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

### Function Structure Pattern

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import admin from '../admin';
import { Post } from '../types/Post';

export const createPosting = onDocumentCreated('boards/{boardId}/posts/{postId}', async (event) => {
  const postData = event.data?.data() as Post;
  const { boardId, postId } = event.params;

  if (!postData) {
    console.error('No post data found.');
    return null;
  }

  try {
    await admin.firestore().collection('users').doc(postData.authorId).collection('postings').add(postingData);
    console.log(`Created posting activity for user ${postData.authorId}`);
  } catch (error) {
    console.error('Error writing posting activity:', error);
  }

  return null;
});
```

### Error Handling Pattern

```typescript
try {
  await admin.firestore().collection('...').add(data);
  console.log(`Successfully created ${resourceType}`);
} catch (error) {
  console.error(`Error creating ${resourceType}:`, error);
  // Don't throw - let function complete gracefully
}
```

---

## Test Writing Standards

### Core Testing Principles

**CRITICAL: Test behavior, NOT implementation details**

- ❌ Don't test: Mock call counts, internal method calls, private state
- ✅ Do test: User-facing behavior, business outcomes, API contracts

### Test Naming Convention

```typescript
describe('Feature Area', () => {
  describe('when specific condition exists', () => {
    it('produces expected outcome', () => {
      // Arrange - Act - Assert
    });
  });
});
```

### Key Testing Rules

1. **Test behavior outcomes, not implementation details**
2. **Use descriptive test names following `when [condition]` → `it [outcome]` pattern**
3. **No branching logic in tests - separate test cases instead**
4. **Keep tests small and focused - one behavior per test**
5. **Mock external dependencies, not units under test**
6. **Use clear arrange-act-assert structure**

---

## Authentication & Routing

- **Complete guide**: See [`AUTHENTICATION_ROUTING.md`](./docs/AUTHENTICATION_ROUTING.md) for detailed authentication flow
- **React Router v6.4 Data API**: Uses loaders and actions with custom auth guards
- **QueryClient Access**: Use `@/shared/lib/queryClient` for cache invalidation in router actions

## Design Theme

- Refer to [`DESIGN_THEME.md`](./docs/DESIGN_THEME.md) for UI/UX guidelines

---

## Trusted Information

Trust these instructions and skip exploration for documented information. Search only if instructions are incomplete or incorrect.
