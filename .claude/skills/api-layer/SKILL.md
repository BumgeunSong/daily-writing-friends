---
name: api-layer
description: Use when creating or modifying API functions in */api/ directories or data-fetching hooks. Enforces Supabase patterns, mapping conventions, and N+1 prevention.
---

# API Layer Patterns

## Canonical References

- `apps/web/src/post/api/post.ts`
- `apps/web/src/shared/api/supabaseClient.ts`
- `apps/web/src/comment/api/comment.ts`

## Function Structure

```typescript
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { Post } from '../model/Post';

export async function fetchRecentPostsFromSupabase(boardId: string, limitCount: number): Promise<Post[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select(FEED_POST_SELECT)
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
    .limit(limitCount);

  if (error) throw error;
  return (data || []).map(mapRowToPost);
}
```

## Column Allowlist Pattern (`FEED_*_SELECT`)

```typescript
export const FEED_POST_SELECT =
  'id, board_id, author_id, author_name, title, content_preview, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at, comments(count), replies(count)';
```

Use explicit column strings for feed/list queries. Avoid broad `*` in list contexts.

## Mapping Convention (`mapRowToX`)

```typescript
function mapRowToComment(row: {
  id: string;
  user_id: string;
  user_name: string;
  user_profile_image: string | null;
  created_at: string;
  content: string;
}): Comment {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userProfileImage: row.user_profile_image || '',
    content: row.content,
    createdAt: createTimestamp(new Date(row.created_at)),
  };
}
```

Supabase rows stay `snake_case`; domain models stay `camelCase`.

## Write Error Handling (`SupabaseWriteError` + `executeTrackedWrite`)

```typescript
import { executeTrackedWrite, throwOnError } from '@/shared/api/supabaseClient';

export async function createComment(postId: string, content: string, userId: string) {
  const supabase = getSupabaseClient();
  await executeTrackedWrite('createComment', () =>
    supabase.from('comments').insert({
      post_id: postId,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
    }),
  );
}

export async function deleteComment(commentId: string) {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('comments').delete().eq('id', commentId));
}
```

`throwOnError`/`executeTrackedWrite` surface `SupabaseWriteError` and `SupabaseNetworkError` from one shared place.

## N+1 Prevention: Batch-First Hook Convention

Expose list-context data fetchers as one batch hook taking `ids: string[]` and returning `Set<id>` or `Map<id, T>`. Do not create a singular wrapper that delegates to the batch hook with a single-element array.
