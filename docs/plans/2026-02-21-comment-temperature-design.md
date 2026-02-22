# Comment Temperature in Post Detail

## Problem

Comment temperature (`🌡️ 댓글 36.5℃`) is shown on PostCard but not in the post detail comment section. Users cannot see commenters' engagement level when reading comments.

## Design

Add comment temperature badge next to each commenter's name in `CommentRow`, reusing the existing `usePostProfileBadges` hook and `WritingBadgeComponent`.

### Changes

1. **CommentRow.tsx** — Call `usePostProfileBadges(comment.userId)`, render badges inline after commenter name
2. **useCreateComment.ts** — Invalidate `['postProfileBadges', currentUser.uid]` on comment/reply creation so temperature updates immediately

### Data flow

```
CommentRow renders
  → usePostProfileBadges(comment.userId) fetches badge data
  → WritingBadgeComponent renders temperature badge
  → User posts comment → invalidates postProfileBadges cache → temperature refreshes
```

### N+1 concern

React Query deduplicates queries by key `['postProfileBadges', userId]`. Duplicate commenters share one cached result. Typical comment sections have few unique users, so this is acceptable.
