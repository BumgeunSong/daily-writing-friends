# CLAUDE.md

## 📐 Design System Reference

- **For all UI, style, layout, and component work, you MUST strictly follow the 100 guidelines (quantitative and qualitative) in [`app_design.md`](./app_design.md).**
- The app_design.md file covers Tailwind, shadcn/ui, mobile-first, responsive design, cards/lists/forms/buttons/nav/status/feedback/accessibility, concrete measurements, naming, structure, and design philosophy actually used in this codebase.
- Whenever you create or modify components, layouts, styles, naming, folder structure, UI/UX improvements, refactoring, or tests, always treat app_design.md as the primary reference.
- If there is any conflict between app_design.md and this file, app_design.md takes precedence. Update CLAUDE.md only to supplement or clarify, never to override app_design.md.

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- `@/features/` → `src/features/`

### Data Layer Pattern
- **Firebase**: Firestore for data, Auth for authentication
- **React Query**: Server state management and caching
- **Zod**: Runtime validation with TypeScript inference
- **Type Safety**: Strict TypeScript with schema-driven development

## Code Writing Practices

### Component Structure
Follow this pattern for all React components:
```typescript
// 1. External imports
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Internal shared imports
import { Button } from '@/shared/ui/button'
import { useAuth } from '@/shared/hooks/useAuth'

// 3. Feature-specific imports
import { usePostEditor } from '../hooks/usePostEditor'
import { PostSchema } from '../model/Post'

// 4. Component definition with TypeScript
interface PostEditorProps {
  boardId: string
  initialContent?: string
}

export function PostEditor({ boardId, initialContent }: PostEditorProps) {
  // Component logic
}
```

### API Layer Pattern
All API functions should be in `[feature]/api/` and follow this pattern:
```typescript
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { PostSchema, type Post } from '../model/Post'

export async function createPost(boardId: string, postData: Omit<Post, 'id' | 'createdAt'>): Promise<Post> {
  const postsRef = collection(db, 'boards', boardId, 'posts')
  const docRef = await addDoc(postsRef, {
    ...postData,
    createdAt: new Date()
  })
  
  return PostSchema.parse({ ...postData, id: docRef.id, createdAt: new Date() })
}
```

### Custom Hooks Pattern
Place business logic in custom hooks in `[feature]/hooks/`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPost, updatePost } from '../api/post'

export function usePostEditor(boardId: string, postId?: string) {
  const queryClient = useQueryClient()
  
  const createMutation = useMutation({
    mutationFn: (data: CreatePostData) => createPost(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', boardId] })
    }
  })
  
  return { createMutation }
}
```

### Model and Schema Pattern
Define types and runtime validation in `[feature]/model/`:
```typescript
import { z } from 'zod'

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
  countOfReplies: z.number().default(0)
})

export type Post = z.infer<typeof PostSchema>
```

## Database Schema Reference

### Core Collections
- **users**: User profiles with subcollections for notifications, writing histories, postings, commentings, replyings
- **boards**: Writing cohorts with posts subcollection, each post has comments subcollection with replies

### Key Data Patterns
1. **User Data**: Use `users/{userId}` for profile data, subcollections for user-specific activity
2. **Board/Post Hierarchy**: `boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}`
3. **User Activity Tracking**: Use `postings`, `commentings`, `replyings` subcollections under users
4. **Writing History**: Track daily writing in `users/{userId}/writingHistories`

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

## Component Patterns

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

## Firebase Functions Patterns

### Function Structure
```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'

export const onPostCreated = onDocumentCreated(
  'boards/{boardId}/posts/{postId}',
  async (event) => {
    const { boardId, postId } = event.params
    const postData = event.data?.data()
    
    // Function logic here
  }
)
```

### Notification Functions
Follow the pattern in `functions/src/notifications/`:
- Generate notification data
- Check notification preferences
- Send FCM messages
- Create Firestore notification documents

## Testing Patterns

### Component Testing
```typescript
import { render, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { PostCard } from '../PostCard'

test('renders post title', () => {
  const mockPost = { title: 'Test Post', ... }
  renderWithProviders(<PostCard post={mockPost} />)
  expect(screen.getByText('Test Post')).toBeInTheDocument()
})
```

### API Testing
Mock Firebase operations in tests:
```typescript
import { vi } from 'vitest'
import { createPost } from '../api/post'

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-id' })
}))
```

## Key Business Logic

### Streak Recovery System
- Located in `src/stats/utils/streakUtils.ts`
- Users can recover missed days by writing twice the next working day
- Handles Korean working days (Mon-Fri, excluding holidays)

### Topic Card System
- Dynamic writing prompts in `src/board/components/TopicCardCarousel.tsx`
- State management with Embla Carousel
- Persistent user preferences

### Real-time Features
- Use Firestore listeners for live updates
- Implement optimistic updates with React Query
- Handle connection state and offline scenarios