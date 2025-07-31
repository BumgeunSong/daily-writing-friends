# CLAUDE.md

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

### Authentication & Routing
- **Complete guide**: See [`AUTHENTICATION_ROUTING.md`](./AUTHENTICATION_ROUTING.md) for detailed authentication flow, route guards, and data fetching strategies
- **React Router v6.4 Data API**: Uses loaders and actions with custom auth guards
- **Hybrid Data Fetching**: Router loaders for initial data + React Query for dynamic updates
- **QueryClient Access**: Use `@/shared/lib/queryClient` for cache invalidation in router actions

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

### Directory Structure
```
functions/
├── src/
│   ├── admin.ts                    # Firebase Admin SDK setup
│   ├── index.ts                    # Function exports
│   ├── dateUtils.ts                # Date utilities
│   ├── notifications/              # Notification system functions
│   │   ├── commentOnPost.ts        # Comment notifications
│   │   ├── replyOnComment.ts       # Reply notifications
│   │   ├── replyOnPost.ts          # Post reply notifications
│   │   ├── sendMessageOnNotification.ts # FCM message sending
│   │   ├── messageGenerator.ts     # Notification message templates
│   │   ├── shouldGenerateNotification.ts # Notification rules
│   │   ├── incrementCommentCount.ts # Comment count updates
│   │   ├── incrementRepliesCount.ts # Reply count updates
│   │   └── updateDaysFromFirstDay.ts # Writing streak calculations
│   ├── postings/                   # Post activity tracking
│   │   ├── createPosting.ts        # Track post creation
│   │   └── updatePosting.ts        # Track post updates
│   ├── commentings/                # Comment activity tracking
│   │   ├── createCommenting.ts     # Track comment creation
│   │   └── updateCommenting.ts     # Track comment updates
│   ├── replyings/                  # Reply activity tracking
│   │   ├── createReplying.ts       # Track reply creation
│   │   └── updateReplying.ts       # Track reply updates
│   ├── writingHistory/             # Writing statistics
│   │   ├── createWritingHistoryOnPostCreated.ts
│   │   ├── deleteWritingHistoryOnPostDeleted.ts
│   │   ├── getWritingStats.ts      # HTTP function for stats
│   │   ├── createBadges.ts         # Achievement system
│   │   ├── createContributions.ts  # Contribution tracking
│   │   └── updateWritingHistoryByBatch.ts
│   ├── types/                      # TypeScript interfaces
│   │   ├── Post.ts, Comment.ts, Reply.ts
│   │   ├── User.ts, Board.ts
│   │   ├── Notification.ts
│   │   ├── Posting.ts, Commenting.ts, Replying.ts
│   │   ├── WritingHistory.ts
│   │   └── FirebaseMessagingToken.ts
│   └── oneTimeScript/              # Administrative functions
│       └── allocateSecretBuddy.ts
├── package.json                    # Dependencies and scripts
└── tsconfig.json                   # TypeScript configuration
```

### Function Structure Pattern
```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import admin from '../admin'
import { Post } from '../types/Post'

export const createPosting = onDocumentCreated(
  'boards/{boardId}/posts/{postId}',
  async (event) => {
    const postData = event.data?.data() as Post
    const { boardId, postId } = event.params
    
    // Always validate data exists
    if (!postData) {
      console.error('No post data found.')
      return null
    }
    
    // Extract required fields
    const { authorId, title, content, createdAt } = postData
    
    // Perform operations with error handling
    try {
      await admin.firestore()
        .collection('users')
        .doc(authorId)
        .collection('postings')
        .add(postingData)
      
      console.log(`Created posting activity for user ${authorId}`)
    } catch (error) {
      console.error('Error writing posting activity:', error)
    }
    
    return null
  }
)
```

### Key Function Categories

#### 1. Activity Tracking Functions
- **createPosting**: Tracks post creation in user's posting history
- **createCommenting**: Tracks comment creation in user's commenting history  
- **createReplying**: Tracks reply creation in user's replying history
- **updatePosting/updateCommenting/updateReplying**: Handle activity updates

#### 2. Notification Functions
```typescript
// Notification creation pattern
import { shouldGenerateNotification } from './shouldGenerateNotification'
import { generateMessage } from './messageGenerator'

export const onCommentCreated = onDocumentCreated(
  'boards/{boardId}/posts/{postId}/comments/{commentId}',
  async (event) => {
    const comment = event.data?.data() as Comment
    const { boardId, postId, commentId } = event.params
    
    // Get post data to find post author
    const postSnapshot = await admin
      .firestore()
      .doc(`boards/${boardId}/posts/${postId}`)
      .get()
    const postData = postSnapshot.data() as Post
    
    // Generate notification message
    const message = generateMessage(
      NotificationType.COMMENT_ON_POST, 
      comment.userName, 
      postData.title
    )
    
    // Check if notification should be sent
    if (shouldGenerateNotification(
      NotificationType.COMMENT_ON_POST, 
      postData.authorId, 
      comment.userId
    )) {
      // Create notification in user's subcollection
      await admin
        .firestore()
        .collection(`users/${postData.authorId}/notifications`)
        .add(notification)
    }
  }
)
```

#### 3. Count Update Functions
- **incrementCommentCount/decrementCommentCount**: Update post comment counts
- **incrementRepliesCount/decrementRepliesCount**: Update comment reply counts
- **updateCommentRepliesCounts**: Batch update reply counts

#### 4. Writing History Functions
- **createWritingHistoryOnPostCreated**: Track daily writing activity
- **deleteWritingHistoryOnPostDeleted**: Remove writing history when post deleted
- **getWritingStats**: HTTP function returning user writing statistics
- **createBadges**: Generate achievement badges based on writing activity
- **updateWritingHistoryByBatch**: Batch update writing histories

#### 5. Real-time Update Functions
- **updateDaysFromFirstDay**: Calculate writing streak days
- **sendMessageOnNotification**: Send FCM push notifications

### TypeScript Interfaces
All functions use strongly typed interfaces from `functions/src/types/`:
```typescript
// Example from functions/src/types/Post.ts
export interface Post {
  id: string
  boardId: string
  title: string
  content: string
  authorId: string
  authorName: string
  createdAt?: Timestamp
  countOfComments: number
  countOfReplies: number
  weekDaysFromFirstDay?: number
}
```

### Admin SDK Setup
```typescript
// functions/src/admin.ts
import * as admin from "firebase-admin"

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
})

export default admin
```

### Development Commands
```bash
# Build functions
npm run build

# Run emulator
npm run serve

# Deploy functions
npm run deploy

# Run tests
npm run test

# Watch mode
npm run build:watch
```

### Error Handling Pattern
Always include proper error handling and logging:
```typescript
try {
  await admin.firestore().collection('...').add(data)
  console.log(`Successfully created ${resourceType}`)
} catch (error) {
  console.error(`Error creating ${resourceType}:`, error)
  // Don't throw - let function complete gracefully
}
```

## Test Writing Standards

### Core Testing Principles

**CRITICAL: Test behavior, NOT implementation details**
- ❌ Don't test: Mock call counts, internal method calls, private state
- ✅ Do test: User-facing behavior, business outcomes, API contracts

**Test Naming Convention:**
```typescript
describe('Feature Area', () => {
  describe('when specific condition exists', () => {
    it('produces expected outcome', () => {
      // Test implementation
    });
  });
});
```

### Behavior-Focused Test Structure

**❌ BAD - Implementation Testing:**
```typescript
it('should call Firebase with correct parameters', () => {
  // Testing HOW it works (implementation details)
  expect(mockFirestore.collection).toHaveBeenCalledWith('users');
  expect(mockFirestore.where).toHaveBeenCalledTimes(2);
});
```

**✅ GOOD - Behavior Testing:**
```typescript
describe('when user has posts on a date', () => {
  it('returns the correct post count', async () => {
    // Testing WHAT it does (business behavior)
    const result = await countPostsOnDate('user123', testDate);
    expect(result).toBe(3);
  });
});
```

### Test Quality Requirements

#### 1. No Branching Logic in Tests
**❌ Avoid:**
```typescript
it('handles different scenarios', () => {
  if (condition) {
    expect(result).toBe(valueA);
  } else {
    expect(result).toBe(valueB);
  }
});
```

**✅ Instead:**
```typescript
describe('when condition is true', () => {
  it('returns value A', () => {
    expect(result).toBe(valueA);
  });
});

describe('when condition is false', () => {
  it('returns value B', () => {
    expect(result).toBe(valueB);
  });
});
```

#### 2. Small, Focused Tests
- **One behavior per test**
- **Single assertion per test** (when possible)
- **Clear arrange-act-assert structure**

```typescript
describe('Recovery Requirements', () => {
  describe('when recovery happens on working day', () => {
    it('requires 2 posts for recovery', () => {
      // Arrange
      const missedDate = new Date('2024-01-16T10:00:00Z');
      const currentDate = new Date('2024-01-17T10:00:00Z');
      
      // Act
      const result = calculateRecoveryRequirement(missedDate, currentDate);
      
      // Assert
      expect(result.postsRequired).toBe(2);
    });
  });
});
```

#### 3. Clear Test Names
**Pattern:** `when [condition]` → `it [expected outcome]`

```typescript
describe('Post Counting', () => {
  describe('when user has posts on date', () => {
    it('returns correct post count', () => { /* ... */ });
    it('includes all posts from that date', () => { /* ... */ });
  });
  
  describe('when user has no posts on date', () => {
    it('returns zero', () => { /* ... */ });
  });
  
  describe('when database query fails', () => {
    it('propagates the error', () => { /* ... */ });
  });
});
```

### Mocking Strategy

#### Mock External Dependencies Only
```typescript
// ✅ Mock external services
jest.mock('../shared/admin');
jest.mock('../shared/calendar');

// ❌ Don't mock units under test
// jest.mock('../streakUtils'); // If testing streakUtils
```

#### Focus on Data Flow, Not Method Calls
```typescript
// ✅ Set up mock data
mockCalendar.didUserMissYesterday.mockResolvedValue(true);
mockCalendar.calculateRecoveryRequirement.mockReturnValue({
  postsRequired: 2
});

// ❌ Don't verify mock calls unless absolutely necessary
// expect(mockCalendar.didUserMissYesterday).toHaveBeenCalledTimes(1);
```

### Test File Organization

#### Behavior-Focused File Naming
- `feature.behavior.test.ts` - Tests business behavior
- `component.test.tsx` - Tests UI component behavior  
- `api.integration.test.ts` - Tests API integration behavior

#### Test Structure Template
```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { functionUnderTest } from '../module';

// Mock external dependencies
jest.mock('../external-dependency');

describe('Module Behavior Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Feature', () => {
    describe('when normal conditions exist', () => {
      it('produces expected outcome', () => {
        // Arrange
        // Act  
        // Assert
      });
    });

    describe('when edge case occurs', () => {
      it('handles gracefully', () => {
        // Arrange
        // Act
        // Assert
      });
    });

    describe('when error conditions exist', () => {
      it('propagates errors appropriately', () => {
        // Arrange
        // Act & Assert
        expect(() => functionUnderTest()).toThrow('Expected error');
      });
    });
  });
});
```

### Error Testing Patterns

```typescript
describe('Error Handling', () => {
  describe('when given invalid input', () => {
    it('throws descriptive error', () => {
      expect(() => functionUnderTest(invalidInput))
        .toThrow('Expected specific error message');
    });
  });

  describe('when external service fails', () => {
    it('propagates service errors', async () => {
      mockService.method.mockRejectedValue(new Error('Service unavailable'));
      
      await expect(functionUnderTest())
        .rejects.toThrow('Service unavailable');
    });
  });
});
```

### React Component Testing

#### Test User Interactions, Not Implementation
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

### Firebase Functions Testing

```typescript
describe('Cloud Function Behavior', () => {
  describe('when document is created', () => {
    it('processes the document correctly', async () => {
      // Arrange
      const mockEvent = {
        data: { data: () => ({ title: 'Test Post' }) },
        params: { userId: 'user123' }
      };
      
      // Act
      const result = await cloudFunction(mockEvent);
      
      // Assert - Test the business outcome
      expect(result).toEqual(expectedResult);
    });
  });
});
```

### Code Testability and Test Value

#### When Code is Hard to Test with Output-Based Tests

If you find it difficult to write tests that compare actual return values to expected values, this often indicates a design issue. Consider refactoring:

**❌ Hard to Test (Side Effects, No Clear Output):**
```typescript
function updateUserStreakStatus(userId: string, date: Date): void {
  // Complex logic with multiple side effects
  // No clear return value to assert on
  const user = getUserFromDatabase(userId);
  if (shouldUpdateStreak(user, date)) {
    updateDatabase(userId, calculateNewStatus(user));
    sendNotification(userId, getNotificationMessage(user));
    logAnalyticsEvent('streak_updated', { userId });
  }
}
```

**✅ Easy to Test (Pure Functions with Clear Outputs):**
```typescript
function calculateStreakUpdate(user: User, date: Date): StreakUpdateResult {
  // Pure function that returns observable data
  return {
    shouldUpdate: shouldUpdateStreak(user, date),
    newStatus: shouldUpdateStreak(user, date) ? calculateNewStatus(user) : user.status,
    notificationMessage: shouldUpdateStreak(user, date) ? getNotificationMessage(user) : null,
    analyticsEvent: shouldUpdateStreak(user, date) ? { event: 'streak_updated', userId: user.id } : null
  };
}

// Separate function for side effects
function applyStreakUpdate(userId: string, update: StreakUpdateResult): void {
  if (update.shouldUpdate) {
    updateDatabase(userId, update.newStatus);
    if (update.notificationMessage) sendNotification(userId, update.notificationMessage);
    if (update.analyticsEvent) logAnalyticsEvent(update.analyticsEvent.event, { userId });
  }
}
```

#### Removing Non-Valuable Tests

Delete tests that don't add value:

**❌ Non-Valuable Tests to Remove:**
```typescript
// Testing library code or framework behavior
it('should call useState', () => {
  render(<Component />);
  expect(React.useState).toHaveBeenCalled(); // Testing React, not your code
});

// Testing mocks instead of behavior
it('should call mock function', () => {
  mockFunction();
  expect(mockFunction).toHaveBeenCalled(); // Only testing the mock
});

// Testing trivial assignments
it('should set property correctly', () => {
  const obj = { prop: 'value' };
  expect(obj.prop).toBe('value'); // No business logic tested
});

// Duplicate tests with no additional value
it('should return true when valid', () => { /* ... */ });
it('should return true for valid input', () => { /* Same test, different name */ });
```

**✅ Valuable Tests to Keep:**
```typescript
// Tests business logic and user-facing behavior
describe('when user completes recovery requirement', () => {
  it('transitions from eligible to on-streak status', async () => {
    const result = await processRecoveryCompletion(userId, requiredPosts);
    expect(result.newStatus).toBe('onStreak');
  });
});

// Tests edge cases and error conditions
describe('when recovery deadline has passed', () => {
  it('prevents status transition and returns error', async () => {
    await expect(processRecoveryCompletion(userId, posts, expiredDeadline))
      .rejects.toThrow('Recovery deadline has passed');
  });
});
```

### Key Testing Rules Summary

1. **Test behavior outcomes, not implementation details**
2. **Use descriptive test names following `when [condition]` → `it [outcome]` pattern**
3. **No branching logic in tests - separate test cases instead**
4. **Keep tests small and focused - one behavior per test**
5. **Mock external dependencies, not units under test**
6. **Focus on user-facing behavior and business logic**
7. **Test error conditions with specific error messages**
8. **Use clear arrange-act-assert structure**
9. **If code is hard to write output-based tests for (comparing actual return values to expected values), consider refactoring the code to make observable outcomes easier to test**
10. **Remove any non-valuable tests that don't meaningfully verify behavior or catch regressions**

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

### 50 Detailed Guidelines for Implementing the Premium Reading Theme
- Refer to 'DESIGN_THEME.md' for this