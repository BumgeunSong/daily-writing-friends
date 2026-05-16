---
name: api-layer
description: Use when creating or modifying API functions in */api/ directories. Enforces Firestore patterns and data fetching conventions.
---

# API Layer Patterns

## File Location

All API functions go in `[feature]/api/`:

```
src/
├── post/
│   └── api/
│       ├── post.ts        # CRUD operations
│       └── postQueries.ts # React Query hooks
```

## Function Structure

```typescript
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
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

## Firestore Best Practices

### Batch Writes for Related Operations
```typescript
import { writeBatch, doc } from 'firebase/firestore';

const batch = writeBatch(db);
batch.set(doc(db, 'posts', postId), postData);
batch.update(doc(db, 'users', userId), { postCount: increment(1) });
await batch.commit();
```

### Collection Paths
```
users/{userId}
users/{userId}/postings/{postingId}
users/{userId}/commentings/{commentingId}
boards/{boardId}/posts/{postId}
boards/{boardId}/posts/{postId}/comments/{commentId}
boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}
```

### Optimistic Updates with React Query
```typescript
const mutation = useMutation({
  mutationFn: createPost,
  onMutate: async (newPost) => {
    await queryClient.cancelQueries({ queryKey: ['posts'] });
    const previous = queryClient.getQueryData(['posts']);
    queryClient.setQueryData(['posts'], (old) => [...old, newPost]);
    return { previous };
  },
  onError: (err, newPost, context) => {
    queryClient.setQueryData(['posts'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

## N+1 Prevention: Batch-First Hook Convention

### Rule

Expose list-context data fetchers as one batch hook taking `ids: string[]` and returning `Set<id>` or `Map<id, T>`. Do not create a singular wrapper that delegates to the batch hook with a single-element array.

### Anti-pattern

```ts
// N+1 vector — unique queryKey per id, React Query cannot dedupe
export function useDonatorStatus(userId: string) {
  const { activeUserIds } = useDonatorStatusBatch([userId]);
  return activeUserIds.has(userId);
}
```

A row component calling this passes review. Mount 100 rows and you get 100 HTTP calls.

### Correct shape

```ts
// Only the batch hook is exposed.
// The list parent fetches once; rows read from props.
const { activeUserIds } = useDonatorStatusBatch(authors.map(a => a.id));
// Pass isDonator={activeUserIds.has(author.id)} to each row.
```

### Single-id contexts (profile page, etc.)

Call the raw fetcher (`fetchActiveDonatorIds([id])`) inline within a page-local hook. Do not export a shared singular hook — a future list will reuse it and reopen the trap.

### Why

A singular wrapper passes code review because each row uses one hook in isolation. N+1 emerges only when many rows mount together. Removing the wrapper removes the trap at the source.

## Quick Reference

| Pattern | When |
|---------|------|
| `addDoc` | Create with auto-ID |
| `setDoc` | Create/overwrite with known ID |
| `updateDoc` | Partial update |
| `writeBatch` | Multiple related writes |
| Listeners | Real-time features |
