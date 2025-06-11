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

### 50 Detailed Guidelines for Implementing the Premium Reading Theme

## Color System Implementation

1. **CSS Variables**: Replace all hard-coded hex colors with CSS custom properties (variables) from the theme system. Example: Use `bg-background` instead of `bg-[#ffffff]`.
2. **Monochromatic Base**: Maintain a pure grayscale foundation with HSL values where saturation is 0% for all base colors (background, foreground, card, etc.).
3. **Accent Color Application**: Apply the blue-gray accent color (`hsl(210, 40%, 92%)` in light mode, `hsl(210, 40%, 15%)` in dark mode) only to interactive elements, focus states, and subtle highlights.
4. **Color Opacity**: When reducing color opacity, use the Tailwind opacity modifier syntax (e.g., `text-foreground/80` for 80% opacity) rather than rgba values.
5. **Border Colors**: Use `border-border/50` for subtle borders (50% opacity) and `border-border` for more prominent ones (100% opacity).


## Typography and Readability

6. **Line Height**: Set body text line height to 1.7 (use `leading-relaxed` or the custom `text-reading` utility) for optimal readability.
7. **Font Size Hierarchy**: Maintain a clear size hierarchy with 16px (1rem) for body text, 14px (0.875rem) for secondary text, and 20px+ (1.25rem+) for headings.
8. **Font Weight**: Use font-weight 400 for body text, 500 for emphasis, and 600 for headings to maintain clear hierarchy.
9. **Letter Spacing**: Apply `-0.025em` letter-spacing to headings and normal letter-spacing to body text.
10. **Text Rendering**: Enable `text-rendering: optimizeLegibility` and font-smoothing for all text to enhance readability.


## Component Styling

11. **Card Design**: Style cards with `bg-card` background, `border-border/50` borders, and the `reading-shadow` utility class for subtle elevation.
12. **Button Styling**: Use minimal styling for buttons with subtle hover states. Primary buttons should use `bg-primary text-primary-foreground` while secondary/ghost buttons use `bg-transparent hover:bg-accent/50`.
13. **Badge Styling**: Style badges with `bg-secondary/80` background, `text-muted-foreground` text, and minimal padding (px-2 py-0.5).
14. **Input Fields**: Style inputs with `bg-input` background, `border-border` borders, and clear focus states using the `reading-focus` utility.
15. **Header Design**: Use `bg-card border-b border-border` for headers with adequate padding (py-3) and container constraints.


## Content Presentation

16. **Text Preview**: Limit content previews to 3 lines using `line-clamp-3` and ensure proper spacing between paragraphs with `prose-p:my-1.5`.
17. **Image Presentation**: Display images with rounded corners (`rounded-lg`), proper aspect ratios, and subtle shadows using the `reading-shadow` utility.
18. **Link Styling**: Style links with the accent color (`text-ring`) without underlines by default, adding underlines only on hover.
19. **List Formatting**: Apply proper spacing to lists with `prose-ol:my-1.5` and `prose-ul:my-1.5` to improve readability.
20. **Code Blocks**: Style code blocks with `bg-muted` background, `rounded-md`, and proper padding for readability.


## Spacing and Layout

21. **Vertical Rhythm**: Maintain consistent vertical spacing between components using multiples of 4px (0.25rem). Use `space-y-4` for card lists and `py-4` for section padding.
22. **Container Width**: Constrain content width using the `container` class with appropriate horizontal padding (`px-4`) to maintain readable line lengths.
23. **Card Spacing**: Apply `space-y-4` to card lists and `p-4` padding within cards for consistent spacing.
24. **Section Margins**: Use `my-6` or `py-6` for major section breaks and `my-3` or `py-3` for minor ones.
25. **Content Padding**: Apply consistent internal padding to content areas: `px-4 py-3` for card content and `px-4 py-2` for headers/footers.


## Interactions and Animations

26. **Hover States**: Apply the `reading-hover` utility to interactive elements, which adds `hover:bg-accent/50 transition-colors duration-200`.
27. **Focus States**: Use the `reading-focus` utility for keyboard focus states, which adds `ring-2 ring-ring ring-offset-2`.
28. **Transition Speed**: Set all transitions to 200ms duration for a premium feel: `transition-all duration-200`.
29. **Active States**: Apply subtle scale transforms on active/pressed states with `active:scale-[0.99]` for buttons and interactive cards.
30. **Loading States**: Use subtle pulse animations for loading states with `animate-pulse` and appropriate background colors.


## Accessibility Considerations

31. **Color Contrast**: Ensure text contrast ratios of at least 4.5:1 for normal text and 3:1 for large text against backgrounds.
32. **Focus Visibility**: Make focus indicators clearly visible with the `reading-focus` utility on all interactive elements.
33. **Text Alternatives**: Provide `alt` text for all images and `aria-label` for icon-only buttons.
34. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible with proper focus order and interaction patterns.
35. **Screen Reader Text**: Use `sr-only` for text that should be announced to screen readers but not visually displayed.


## Mobile Optimizations

36. **Touch Targets**: Ensure all interactive elements have touch targets of at least 44×44 pixels for mobile users.
37. **Responsive Typography**: Scale down headings on mobile by 1-2px using responsive modifiers (e.g., `text-xl md:text-2xl`).
38. **Mobile Spacing**: Reduce horizontal padding on mobile with responsive classes: `px-3 md:px-4`.
39. **Card Layout**: Stack cards vertically on mobile with full width and reduced margins.
40. **Mobile Navigation**: Ensure the header is compact on mobile with appropriate spacing for touch targets.


## Dark Mode Implementation

41. **Dark Mode Colors**: Define separate dark mode colors in the CSS variables using the `.dark` class prefix.
42. **Dark Mode Shadows**: Adjust shadow intensity in dark mode to be more subtle using the `.dark .reading-shadow` selector.
43. **Dark Mode Text**: Slightly reduce contrast in dark mode by using off-white (`hsl(0, 0%, 95%)`) instead of pure white for better eye comfort.
44. **Dark Mode Borders**: Use lower opacity borders in dark mode (e.g., `dark:border-border/30`) for a softer appearance.
45. **Dark Mode Images**: Apply subtle brightness/contrast adjustments to images in dark mode if needed.


## Technical Implementation

46. **CSS Utility Classes**: Define custom utilities like `reading-shadow`, `reading-focus`, `reading-hover`, `text-reading`, and `text-reading-sm` in the global CSS file.
47. **Theme Provider**: Implement the theme provider from `next-themes` in your layout component to enable theme switching.
48. **CSS Variables**: Define all theme colors as HSL values in CSS custom properties for easy manipulation.
49. **Consistent Imports**: Use consistent import paths for UI components (e.g., `@/shared/ui/button`) throughout the application.
50. **Quality Checks**: Regularly audit the application for inconsistent styling, hard-coded colors, or accessibility issues using automated tools and manual review.


## Bear App Style Implementation (심플하고 프리미엄한 느낌)

51. **Minimal Borders**: Remove unnecessary borders from headers and wrapper containers to achieve a clean, Bear-app-like aesthetic. Headers should use only `bg-card` without `border-b`.
52. **Content-First Approach**: Eliminate redundant container wrappers that add extra borders, backgrounds, or shadows around content lists. Let individual cards provide their own elevation.
53. **Visual Hierarchy Simplification**: Use only essential visual elements - each PostCard should have its own `reading-shadow` and `border-border/50`, while avoiding additional container decoration.
54. **Premium Simplicity**: Follow the principle that less visual noise creates a more premium, focused reading experience. Remove borders that don't serve a clear functional purpose.
55. **Natural Content Flow**: Allow content to flow naturally without artificial container boundaries, similar to Bear app's seamless content presentation.


## 완료된 개선사항 (Migration Completed)

### PostCard.tsx Improvements:
- ✅ **Custom Class Removal**: Replaced `notebook-shadow` with `reading-shadow` utility class
- ✅ **Hover State Unification**: Converted `hover:bg-accent/30` to `reading-hover` utility for consistency
- ✅ **Border Consistency**: Standardized all borders to use `border-border/50` (50% opacity)
- ✅ **Responsive Spacing**: Applied `px-3 md:px-4` responsive padding throughout
- ✅ **Responsive Typography**: Used `text-lg md:text-xl` for scalable text sizes
- ✅ **Accessibility Enhancement**: Added `reading-focus` and `active:scale-[0.99]` to all interactive elements
- ✅ **Touch Target Compliance**: Ensured all interactive areas meet 44px minimum requirement

### BoardPageHeader.tsx Improvements:
- ✅ **Border Removal**: Eliminated `border-b` for Bear app-style simplicity
- ✅ **Responsive Container**: Applied `px-3 md:px-4` for consistent mobile/desktop spacing
- ✅ **Touch-Friendly Links**: Added `min-h-[44px]` and proper interaction states
- ✅ **Typography Scaling**: Implemented `text-xl md:text-2xl` responsive sizing
- ✅ **Icon Optimization**: Applied `size-4 md:size-5` for mobile-appropriate icon sizes

### BoardPage.tsx Improvements:
- ✅ **Container Simplification**: Removed unnecessary wrapper with borders, shadows, and background
- ✅ **Direct Content Rendering**: PostCardList renders directly without decorative container
- ✅ **Visual Noise Reduction**: Eliminated redundant styling that competed with individual card designs
- ✅ **Bear-Style Layout**: Achieved clean, focused content presentation similar to premium apps


## Migration Best Practices

56. **One Component at a Time**: Migrate components systematically, completing each before moving to the next.
57. **Custom Class Elimination**: Replace all custom classes (e.g., `notebook-shadow`, `notebook-gradient`) with utility classes.
58. **Border Consistency**: Standardize border opacity - use `border-border/50` for subtle borders, `border-border` for prominent ones.
59. **Responsive-First**: Always implement mobile-first responsive patterns with `px-3 md:px-4` and similar patterns.
60. **Interaction States**: Ensure all interactive elements have `reading-hover`, `reading-focus`, and `active:scale-[0.99]` states.


These guidelines provide a comprehensive framework for implementing the premium monochromatic reading theme consistently across your entire application, ensuring a cohesive, high-quality user experience optimized for reading and writing.