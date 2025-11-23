# Web Package - CLAUDE.md

This file provides web-specific guidance for the frontend React application.

## Architecture Overview

### Feature-Based Organization

Each feature follows this structure:

```
src/[feature]/
├── api/           # Data fetching & mutations
├── components/    # React components
├── hooks/         # Custom hooks
├── model/         # TypeScript types & Zod schemas
├── utils/         # Feature-specific utilities
└── test/          # Feature tests
```

### Path Aliases (vite.config.ts)

- `@/` → `src/`
- `@/shared/` → `src/shared/`
- `@board` → `src/board/`
- `@post` → `src/post/`
- `@comment` → `src/comment/`
- `@draft` → `src/draft/`
- `@notification` → `src/notification/`
- `@user` → `src/user/`
- `@login` → `src/login/`
- `@stats` → `src/stats/`

### Data Layer Pattern

- **Firebase**: Firestore for data, Auth for authentication
- **React Query**: Server state management and caching
- **Zod**: Runtime validation with TypeScript inference
- **Type Safety**: Strict TypeScript with schema-driven development

### Authentication & Routing

- **Complete guide**: See [`AUTHENTICATION_ROUTING.md`](../../docs/AUTHENTICATION_ROUTING.md) for detailed authentication flow, route guards, and data fetching strategies
- **React Router v6.4 Data API**: Uses loaders and actions with custom auth guards
- **Hybrid Data Fetching**: Router loaders for initial data + React Query for dynamic updates
- **QueryClient Access**: Use `@/shared/lib/queryClient` for cache invalidation in router actions

## Component Patterns

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
import { PostSchema } from '../model/Post';

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

All API functions should be in `[feature]/api/` and follow this pattern:

```typescript
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { PostSchema, type Post } from '../model/Post';

export async function createPost(
  boardId: string,
  postData: Omit<Post, 'id' | 'createdAt'>,
): Promise<Post> {
  const postsRef = collection(db, 'boards', boardId, 'posts');
  const docRef = await addDoc(postsRef, {
    ...postData,
    createdAt: new Date(),
  });

  return PostSchema.parse({ ...postData, id: docRef.id, createdAt: new Date() });
}
```

### Custom Hooks Pattern

Place business logic in custom hooks in `[feature]/hooks/`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPost, updatePost } from '../api/post';

export function usePostEditor(boardId: string, postId?: string) {
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

### Model and Schema Pattern

Define types and runtime validation in `[feature]/model/`:

```typescript
import { z } from 'zod';

export const PostSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  createdAt: z.date(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  countOfComments: z.number().default(0),
  countOfReplies: z.number().default(0),
});

export type Post = z.infer<typeof PostSchema>;
```

## UI Component Patterns

### Shared UI Components

- Use shadcn/ui components from `@/shared/ui/`
- Compose complex components from base UI components
- Follow Radix UI patterns for accessibility

### Error Boundaries

Wrap feature components with error boundaries:

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

<ErrorBoundary fallback={<ErrorFallback />}>
  <FeatureComponent />
</ErrorBoundary>
```

### Loading States

Use skeleton components for loading states:

```typescript
import { PostCardSkeleton } from '@/shared/ui/PostCardSkeleton'

{isLoading ? <PostCardSkeleton /> : <PostCard post={post} />}
```

## Firebase Client Patterns

### Firestore Best Practices

- Always use batch writes for related operations
- Implement optimistic updates with React Query
- Use Firestore listeners for real-time features
- Validate data with Zod schemas before writing

### Security Rules Pattern

```typescript
// Always check user permissions
match /boards/{boardId}/posts/{postId} {
  allow read: if request.auth != null &&
    resource.data.visibility == 'PUBLIC' ||
    resource.data.authorId == request.auth.uid
}
```

## Testing Patterns for React Components

### Test User Interactions, Not Implementation

```typescript
describe('PostEditor Component', () => {
  describe('when user types in editor', () => {
    it('updates the content', () => {
      render(<PostEditor />);

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: 'New content' } });

      expect(editor).toHaveValue('New content');
    });
  });

  describe('when user clicks save', () => {
    it('calls onSave with current content', () => {
      const mockOnSave = jest.fn();
      render(<PostEditor onSave={mockOnSave} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(mockOnSave).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
```

### Key Testing Rules for Components

1. **Test user-facing behavior, not React internals**
2. **Use Testing Library queries (getByRole, getByText, etc.)**
3. **Simulate user interactions with fireEvent or userEvent**
4. **Assert on DOM state, not component state**
5. **Mock external dependencies (API calls, Firebase), not React hooks**

## Development Commands

```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm type-check

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

See [vite.config.ts](vite.config.ts) for environment variable configuration. The config loads from the monorepo root `.env` file:

```typescript
// Loads .env from monorepo root (../../.env)
const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
```

Required environment variables (with `VITE_` prefix):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_USE_FIREBASE_EMULATOR` (boolean)
