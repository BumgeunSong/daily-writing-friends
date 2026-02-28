# Type System Strengthening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen the frontend type system to catch bugs at compile time that currently only surface at runtime — swapped IDs, impossible states, untyped data boundaries, and scattered inline types.

**Architecture:** Incremental, non-breaking approach. Start with low-effort leaf changes (type annotations, extracted interfaces) that require zero consumer changes, then progress to structural refactors (discriminated unions, branded IDs) that ripple through consumers. Each task is self-contained and independently committable.

**Tech Stack:** TypeScript 5.x, Vitest, Zod (existing validation layer)

**Scope:** `src/` only (frontend). `functions/` is out of scope (Firebase functions are being phased out).

---

## Phase 1: Low-Effort Leaf Changes (No Consumer Changes)

These tasks tighten types at module boundaries without changing any caller.

---

### Task 1: Extract `UserSummary` Shared Type

The user profile fragment `{ userId, userName, userProfileImage }` is duplicated inline in 5+ places. Extract it to a single shared type.

**Files:**
- Create: `src/shared/model/UserSummary.ts`
- Test: `src/shared/model/UserSummary.test.ts`

**Step 1: Write the type and a compile-time assertion test**

```typescript
// src/shared/model/UserSummary.ts
export interface UserSummary {
  userId: string;
  userName: string;
  userProfileImage: string;
}
```

```typescript
// src/shared/model/UserSummary.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type { UserSummary } from './UserSummary';
import type { ReactionUser } from '@/comment/model/Reaction';

describe('UserSummary', () => {
  it('is structurally compatible with ReactionUser', () => {
    expectTypeOf<UserSummary>().toMatchTypeOf<ReactionUser>();
  });

  it('has exactly three fields', () => {
    const summary: UserSummary = {
      userId: 'u1',
      userName: 'test',
      userProfileImage: 'https://example.com/photo.jpg',
    };
    expect(Object.keys(summary)).toHaveLength(3);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run src/shared/model/UserSummary.test.ts`
Expected: PASS

**Step 3: Re-export `UserSummary` from `Reaction.ts` to use the shared type**

Modify `src/comment/model/Reaction.ts`:
```typescript
import type { UserSummary } from '@/shared/model/UserSummary';

export type ReactionUser = UserSummary;

export interface Reaction {
  id: string;
  content: string;
  createdAt: Date;
  reactionUser: UserSummary;
}

export interface GroupedReaction {
  content: string;
  by: UserSummary[];
}
```

**Step 4: Run full test suite to verify no regressions**

Run: `npx vitest run`
Expected: All existing tests pass

**Step 5: Commit**

```bash
git add src/shared/model/UserSummary.ts src/shared/model/UserSummary.test.ts src/comment/model/Reaction.ts
git commit -m "refactor: extract UserSummary shared type from duplicated inline definitions"
```

---

### Task 2: Type the Supabase User Update Mapper

`mapUserToSupabaseUpdate` returns `Record<string, unknown>` — a typo in a column name silently fails. Give it a proper return type.

**Files:**
- Modify: `src/user/utils/userMappers.ts`
- Modify: `src/user/utils/userMappers.test.ts`

**Step 1: Write a test that asserts the return type shape**

Add to `src/user/utils/userMappers.test.ts`:
```typescript
import { expectTypeOf } from 'vitest';

describe('mapUserToSupabaseUpdate type safety', () => {
  it('returns typed SupabaseUserUpdate, not Record<string, unknown>', () => {
    const result = mapUserToSupabaseUpdate({ nickname: 'test' });
    expectTypeOf(result).toHaveProperty('nickname');
    // Verify it does NOT allow arbitrary keys at the type level
    // @ts-expect-error - typo_column should not exist on SupabaseUserUpdate
    result.typo_column;
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/user/utils/userMappers.test.ts`
Expected: FAIL — `@ts-expect-error` is unused because `Record<string, unknown>` allows any key

**Step 3: Add typed return interface**

Modify `src/user/utils/userMappers.ts`:
```typescript
import type { User } from '@/user/model/User';

export interface SupabaseUserUpdate {
  real_name?: string | null;
  nickname?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  referrer?: string | null;
}

export function mapUserToSupabaseUpdate(data: Partial<User>): SupabaseUserUpdate {
  const updateData: SupabaseUserUpdate = {};
  if (data.realName !== undefined) updateData.real_name = data.realName;
  if (data.nickname !== undefined) updateData.nickname = data.nickname;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.profilePhotoURL !== undefined) updateData.profile_photo_url = data.profilePhotoURL;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
  if (data.referrer !== undefined) updateData.referrer = data.referrer;
  return updateData;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/user/utils/userMappers.test.ts`
Expected: PASS — the `@ts-expect-error` now correctly catches the invalid key

**Step 5: Commit**

```bash
git add src/user/utils/userMappers.ts src/user/utils/userMappers.test.ts
git commit -m "refactor: type mapUserToSupabaseUpdate return as SupabaseUserUpdate instead of Record<string, unknown>"
```

---

### Task 3: Make `Post.createdAt` and `Post.visibility` Required

`createdAt` is always present after mapping from Supabase. `visibility` always defaults to PUBLIC in the mapper. Making them required eliminates dead null-checks across consumers.

**Files:**
- Modify: `src/post/model/Post.ts`
- Modify: `src/post/model/PostSchema.ts`

**Step 1: Write a test that confirms the mapper always provides these fields**

Create `src/post/model/Post.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { PostVisibility } from './Post';
import { mapRowToPost } from '@/shared/api/supabaseReads';

describe('Post type invariants', () => {
  it('mapRowToPost always provides createdAt', () => {
    const row = {
      id: 'p1', board_id: 'b1', author_id: 'u1', author_name: 'Test',
      title: 'Title', content: 'Body', content_json: null,
      thumbnail_image_url: null, visibility: null,
      count_of_comments: 0, count_of_replies: 0, count_of_likes: 0,
      engagement_score: 0, week_days_from_first_day: null,
      created_at: '2026-01-15T09:00:00Z', updated_at: '2026-01-15T09:00:00Z',
    };
    const post = mapRowToPost(row);
    expect(post.createdAt).toBeDefined();
    expect(post.createdAt.toDate()).toBeInstanceOf(Date);
  });

  it('mapRowToPost defaults visibility to PUBLIC when null', () => {
    const row = {
      id: 'p1', board_id: 'b1', author_id: 'u1', author_name: 'Test',
      title: 'Title', content: 'Body', content_json: null,
      thumbnail_image_url: null, visibility: null,
      count_of_comments: 0, count_of_replies: 0, count_of_likes: 0,
      engagement_score: 0, week_days_from_first_day: null,
      created_at: '2026-01-15T09:00:00Z', updated_at: '2026-01-15T09:00:00Z',
    };
    const post = mapRowToPost(row);
    expect(post.visibility).toBe(PostVisibility.PUBLIC);
  });
});
```

**Step 2: Run test to verify it passes (mapper already does this)**

Run: `npx vitest run src/post/model/Post.test.ts`
Expected: PASS

**Step 3: Make the fields required in the type**

Modify `src/post/model/Post.ts`:
```typescript
export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  contentJson?: ProseMirrorDoc;
  thumbnailImageURL: string | null;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;          // was optional, now required
  countOfComments: number;
  countOfReplies: number;
  countOfLikes: number;
  engagementScore?: number;
  updatedAt?: Timestamp;
  weekDaysFromFirstDay?: number;
  visibility: PostVisibility;    // was optional, now required
  authorProfileImageURL?: string;
}
```

**Step 4: Run TypeScript compiler to find broken consumers**

Run: `npx tsc --noEmit`
Expected: Any consumer that constructs a `Post` without `createdAt` or `visibility` now fails. Fix each by adding the value (the mapper already provides it). If there are test fixtures constructing Posts, update them.

**Step 5: Fix any compile errors, run full tests**

Run: `npx vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git add src/post/model/Post.ts src/post/model/Post.test.ts
# plus any files with compile fixes
git commit -m "refactor: make Post.createdAt and Post.visibility required fields"
```

---

### Task 4: Type the Supabase Join Row Types (Eliminate `any` casts)

Four functions in `supabaseReads.ts` use `as any` to handle PostgREST join results. Define explicit row types for each join shape.

**Files:**
- Modify: `src/shared/api/supabaseReads.ts`

**Step 1: Define the join row interfaces**

Add these interfaces above the functions that use them in `supabaseReads.ts`:

```typescript
/** Row shape from: comments.select('id, content, created_at, post_id, posts!inner(id, title, author_id, board_id)') */
interface CommentWithPostJoin {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  posts: { id: string; title: string; author_id: string; board_id: string }
    | { id: string; title: string; author_id: string; board_id: string }[];
}

/** Row shape from: replies.select('id, created_at, comment_id, post_id, user_id, comments!inner(id), posts!inner(id, title, author_id, board_id)') */
interface ReplyWithJoins {
  id: string;
  created_at: string;
  comment_id: string;
  post_id: string;
  user_id: string;
  comments: { id: string } | { id: string }[];
  posts: { id: string; title: string; author_id: string; board_id: string }
    | { id: string; title: string; author_id: string; board_id: string }[];
}

/** Row shape from: user_board_permissions.select('..., boards!inner(...), users!inner(...)') */
interface BoardPermissionWithJoins {
  board_id: string;
  permission: string;
  boards: {
    id: string; title: string; description: string | null;
    first_day: string | null; last_day: string | null;
    cohort: number | null; created_at: string;
  } | {
    id: string; title: string; description: string | null;
    first_day: string | null; last_day: string | null;
    cohort: number | null; created_at: string;
  }[];
}

/** Row shape from: user_board_permissions.select('..., users!inner(...)') */
interface UserPermissionWithJoins {
  user_id: string;
  board_id: string;
  permission: string;
  users: {
    id: string; real_name: string | null; nickname: string | null;
    email: string | null; profile_photo_url: string | null;
    bio: string | null; phone_number: string | null;
    referrer: string | null; timezone: string | null;
  } | {
    id: string; real_name: string | null; nickname: string | null;
    email: string | null; profile_photo_url: string | null;
    bio: string | null; phone_number: string | null;
    referrer: string | null; timezone: string | null;
  }[];
}
```

**Step 2: Replace all `any` casts with the typed interfaces**

In each function, replace `(row: any)` with the corresponding interface:
- `fetchCommentingsByDateRangeFromSupabase`: `(data as CommentWithPostJoin[])`
- `fetchReplyingsByDateRangeFromSupabase`: `(data as ReplyWithJoins[])`
- `fetchBoardsFromSupabase`: `(data as BoardPermissionWithJoins[])`
- `fetchUsersWithBoardPermissionFromSupabase`: `(data as UserPermissionWithJoins[])`

Remove all `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments.

**Step 3: Run TypeScript compiler to verify**

Run: `npx tsc --noEmit`
Expected: No errors — the typed interfaces match what PostgREST returns

**Step 4: Run existing tests**

Run: `npx vitest run src/shared/api/supabaseReads.test.ts`
Expected: PASS (no runtime changes)

**Step 5: Commit**

```bash
git add src/shared/api/supabaseReads.ts
git commit -m "refactor: replace any casts in supabaseReads with typed join row interfaces"
```

---

### Task 5: Extract Named `NotificationRow` Type

`fetchNotificationsFromSupabase` returns an inline anonymous type. Extract it to a named interface with `NotificationType` instead of `string`.

**Files:**
- Modify: `src/shared/api/supabaseReads.ts`
- Modify: `src/notification/api/notificationApi.ts`

**Step 1: Define the named interface**

Add to `supabaseReads.ts` near the notification section:
```typescript
import { NotificationType } from '@/notification/model/Notification';

export interface NotificationRow {
  id: string;
  type: NotificationType;
  boardId: string;
  postId: string;
  commentId?: string;
  replyId?: string;
  fromUserId: string;
  fromUserProfileImage?: string;
  message: string;
  timestamp: string; // ISO string from Supabase
  read: boolean;
}
```

**Step 2: Update the return type of `fetchNotificationsFromSupabase`**

Change the return type from inline to `Promise<NotificationRow[]>`.

In the mapper, cast `row.type` to `NotificationType`:
```typescript
type: row.type as NotificationType,
```

**Step 3: Update `notificationApi.ts` to use the typed row**

The cast `row.type as Notification['type']` is now unnecessary since `NotificationRow.type` is already `NotificationType`.

**Step 4: Run TypeScript compiler and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass

**Step 5: Commit**

```bash
git add src/shared/api/supabaseReads.ts src/notification/api/notificationApi.ts
git commit -m "refactor: extract NotificationRow type with NotificationType instead of string"
```

---

## Phase 2: Structural Refactors (Consumer Changes Required)

These tasks change type shapes, requiring updates to consumers. Each is self-contained.

---

### Task 6: Discriminated Union for Notification

Replace the flat `Notification` interface (with optional `commentId`/`replyId`) with a discriminated union on `type`. Consumers that `switch` on `type` get free field narrowing.

**Files:**
- Modify: `src/notification/model/Notification.ts`
- Modify: `src/notification/api/notificationApi.ts`
- Modify: All notification consumers (components, hooks)

**Step 1: Write tests for the discriminated union behavior**

Create `src/notification/model/Notification.test.ts`:
```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type { Notification } from './Notification';
import { NotificationType } from './Notification';

describe('Notification discriminated union', () => {
  it('narrows to CommentNotification when type is COMMENT_ON_POST', () => {
    const n = {
      id: '1', type: NotificationType.COMMENT_ON_POST,
      boardId: 'b1', postId: 'p1', commentId: 'c1',
      fromUserId: 'u1', message: 'test', timestamp: {} as any, read: false,
    } satisfies Notification;

    if (n.type === NotificationType.COMMENT_ON_POST) {
      expectTypeOf(n.commentId).toBeString();
    }
  });

  it('narrows to LikeNotification which has no commentId', () => {
    const n = {
      id: '1', type: NotificationType.LIKE_ON_POST,
      boardId: 'b1', postId: 'p1',
      fromUserId: 'u1', message: 'test', timestamp: {} as any, read: false,
    } satisfies Notification;

    if (n.type === NotificationType.LIKE_ON_POST) {
      // @ts-expect-error - LikeNotification should not have commentId
      n.commentId;
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/notification/model/Notification.test.ts`
Expected: FAIL — current flat interface allows `commentId` on all types

**Step 3: Implement the discriminated union**

Replace the content of `src/notification/model/Notification.ts`:
```typescript
import type { Timestamp } from 'firebase/firestore';

export enum NotificationType {
  COMMENT_ON_POST = 'comment_on_post',
  REPLY_ON_COMMENT = 'reply_on_comment',
  REPLY_ON_POST = 'reply_on_post',
  REACTION_ON_COMMENT = 'reaction_on_comment',
  REACTION_ON_REPLY = 'reaction_on_reply',
  LIKE_ON_POST = 'like_on_post',
}

interface NotificationBase {
  id: string;
  boardId: string;
  postId: string;
  fromUserId: string;
  fromUserProfileImage?: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface CommentNotification extends NotificationBase {
  type: NotificationType.COMMENT_ON_POST;
  commentId: string;
}

export interface ReplyOnCommentNotification extends NotificationBase {
  type: NotificationType.REPLY_ON_COMMENT;
  commentId: string;
  replyId: string;
}

export interface ReplyOnPostNotification extends NotificationBase {
  type: NotificationType.REPLY_ON_POST;
  replyId: string;
}

export interface ReactionOnCommentNotification extends NotificationBase {
  type: NotificationType.REACTION_ON_COMMENT;
  commentId: string;
}

export interface ReactionOnReplyNotification extends NotificationBase {
  type: NotificationType.REACTION_ON_REPLY;
  commentId: string;
  replyId: string;
}

export interface LikeNotification extends NotificationBase {
  type: NotificationType.LIKE_ON_POST;
}

export type Notification =
  | CommentNotification
  | ReplyOnCommentNotification
  | ReplyOnPostNotification
  | ReactionOnCommentNotification
  | ReactionOnReplyNotification
  | LikeNotification;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/notification/model/Notification.test.ts`
Expected: PASS

**Step 5: Fix compile errors in consumers**

Run: `npx tsc --noEmit`

For the mapper in `notificationApi.ts`, the construction of each notification variant must include the correct fields per type. Update the mapper to use a helper:

```typescript
function mapRowToNotification(row: NotificationRow): Notification {
  const base = {
    id: row.id,
    boardId: row.boardId,
    postId: row.postId,
    fromUserId: row.fromUserId,
    fromUserProfileImage: row.fromUserProfileImage,
    message: row.message,
    timestamp: Timestamp.fromDate(new Date(row.timestamp)),
    read: row.read,
  };

  switch (row.type) {
    case NotificationType.COMMENT_ON_POST:
      return { ...base, type: row.type, commentId: row.commentId! };
    case NotificationType.REPLY_ON_COMMENT:
      return { ...base, type: row.type, commentId: row.commentId!, replyId: row.replyId! };
    case NotificationType.REPLY_ON_POST:
      return { ...base, type: row.type, replyId: row.replyId! };
    case NotificationType.REACTION_ON_COMMENT:
      return { ...base, type: row.type, commentId: row.commentId! };
    case NotificationType.REACTION_ON_REPLY:
      return { ...base, type: row.type, commentId: row.commentId!, replyId: row.replyId! };
    case NotificationType.LIKE_ON_POST:
      return { ...base, type: row.type };
  }
}
```

For notification components that access `commentId`/`replyId`, add a `switch` or `if` guard on `notification.type` before accessing these fields.

**Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All pass

**Step 7: Commit**

```bash
git add src/notification/model/Notification.ts src/notification/model/Notification.test.ts src/notification/api/notificationApi.ts
# plus any consumer fixes
git commit -m "refactor: Notification as discriminated union — compiler enforces field access by type"
```

---

### Task 7: Discriminated Union for Reaction Target

`CreateReactionParams` has `commentId` (required) + `replyId?` (optional), but a reaction targets one or the other, not both.

**Files:**
- Modify: `src/comment/api/reaction.ts`
- Modify: Callers of `createReaction` and `deleteUserReaction`

**Step 1: Write type-level tests**

Create `src/comment/api/reaction.test.ts`:
```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type { CreateReactionParams } from './reaction';

describe('CreateReactionParams discriminated union', () => {
  it('allows comment reaction without replyId', () => {
    const params: CreateReactionParams = {
      target: 'comment',
      boardId: 'b1', postId: 'p1', commentId: 'c1',
      content: '👍',
      reactionUser: { userId: 'u1', userName: 'Test', userProfileImage: '' },
    };
    expectTypeOf(params).toMatchTypeOf<CreateReactionParams>();
  });

  it('requires replyId for reply reactions', () => {
    const params: CreateReactionParams = {
      target: 'reply',
      boardId: 'b1', postId: 'p1', commentId: 'c1', replyId: 'r1',
      content: '👍',
      reactionUser: { userId: 'u1', userName: 'Test', userProfileImage: '' },
    };
    expectTypeOf(params).toMatchTypeOf<CreateReactionParams>();
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — `target` property doesn't exist on current type

**Step 3: Implement the discriminated union**

```typescript
interface ReactionParamsBase {
  boardId: string;
  postId: string;
  content: string;
  reactionUser: {
    userId: string;
    userName: string;
    userProfileImage: string;
  };
}

export interface CommentReactionParams extends ReactionParamsBase {
  target: 'comment';
  commentId: string;
}

export interface ReplyReactionParams extends ReactionParamsBase {
  target: 'reply';
  commentId: string;
  replyId: string;
}

export type CreateReactionParams = CommentReactionParams | ReplyReactionParams;
```

Update `createReaction` function body to use `params.target === 'reply'` instead of `if (replyId)`.

Similarly update `DeleteReactionParams` and `GetReactionsParams`.

**Step 4: Run test to verify it passes, fix compile errors in callers**

Run: `npx tsc --noEmit && npx vitest run`

**Step 5: Commit**

```bash
git add src/comment/api/reaction.ts src/comment/api/reaction.test.ts
# plus caller fixes
git commit -m "refactor: CreateReactionParams as discriminated union with explicit target"
```

---

### Task 8: Branded IDs for Core Entities

Introduce branded ID types so that `UserId`, `PostId`, `BoardId`, `CommentId` cannot be interchanged.

**Files:**
- Create: `src/shared/model/brandedIds.ts`
- Create: `src/shared/model/brandedIds.test.ts`
- Modify: Model files to use branded IDs (incremental — start with `User.uid` and `Post.id`)

**Step 1: Define the branded types and constructors**

```typescript
// src/shared/model/brandedIds.ts

/** Branded type factory — zero runtime cost */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type BoardId = Brand<string, 'BoardId'>;
export type PostId = Brand<string, 'PostId'>;
export type CommentId = Brand<string, 'CommentId'>;
export type ReplyId = Brand<string, 'ReplyId'>;

/**
 * Cast a raw string to a branded ID.
 * Use at trust boundaries (API responses, URL params) only.
 */
export const asUserId = (id: string) => id as UserId;
export const asBoardId = (id: string) => id as BoardId;
export const asPostId = (id: string) => id as PostId;
export const asCommentId = (id: string) => id as CommentId;
export const asReplyId = (id: string) => id as ReplyId;
```

**Step 2: Write compile-time safety tests**

```typescript
// src/shared/model/brandedIds.test.ts
import { describe, it, expect } from 'vitest';
import { asUserId, asPostId } from './brandedIds';
import type { UserId, PostId } from './brandedIds';

describe('Branded IDs', () => {
  it('prevents assigning UserId to PostId', () => {
    const userId: UserId = asUserId('user-123');
    // @ts-expect-error — UserId is not assignable to PostId
    const postId: PostId = userId;
  });

  it('allows using branded IDs as regular strings at runtime', () => {
    const userId = asUserId('user-123');
    expect(userId).toBe('user-123');
    expect(typeof userId).toBe('string');
  });

  it('allows string operations on branded IDs', () => {
    const userId = asUserId('user-123');
    expect(userId.startsWith('user')).toBe(true);
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run src/shared/model/brandedIds.test.ts`
Expected: PASS

**Step 4: Adopt in `User` and `Post` models (first two adopters)**

Modify `src/user/model/User.ts`:
```typescript
import type { UserId } from '@/shared/model/brandedIds';

export interface User {
  uid: UserId;
  // ... rest unchanged
}
```

Modify `src/post/model/Post.ts`:
```typescript
import type { PostId, BoardId, UserId } from '@/shared/model/brandedIds';

export interface Post {
  id: PostId;
  boardId: BoardId;
  authorId: UserId;
  // ... rest unchanged
}
```

**Step 5: Fix compile errors at trust boundaries (mappers)**

In `supabaseReads.ts` mappers, wrap raw strings with `asUserId()`, `asPostId()`, `asBoardId()`:
```typescript
return {
  id: asPostId(row.id),
  boardId: asBoardId(row.board_id),
  authorId: asUserId(row.author_id),
  // ...
};
```

**Step 6: Run full test suite, fix any remaining compile errors**

Run: `npx tsc --noEmit && npx vitest run`

**Step 7: Commit**

```bash
git add src/shared/model/brandedIds.ts src/shared/model/brandedIds.test.ts src/user/model/User.ts src/post/model/Post.ts src/shared/api/supabaseReads.ts
git commit -m "refactor: introduce branded IDs for UserId, PostId, BoardId — prevents argument swapping"
```

**Note:** Further adoption across Comment, Notification, etc. can be done in follow-up PRs. The types are defined and ready.

---

## Phase 3: Skill Creation

### Task 9: Create `type-system` Claude Skill

Create a reusable skill that codifies the type system analysis methodology with real examples from this codebase.

**Files:**
- Create: `.claude/skills/type-system/SKILL.md`

**Step 1: Create the skill directory**

```bash
mkdir -p .claude/skills/type-system
```

**Step 2: Write the SKILL.md**

The skill should:
- Trigger when doing type system analysis or reviewing types
- Include the 7 opportunity categories
- Include real-world examples from DailyWritingFriends
- Include common mistakes section
- Be under 680 tokens in the main body (progressive disclosure)

See full content below in Step 3.

**Step 3: Write the skill file**

Create `.claude/skills/type-system/SKILL.md` with the content from the skill specification (see Task 9 content section below).

**Step 4: Verify skill loads**

Run: `/type-system` in a new Claude session
Expected: Skill loads and displays analysis framework

**Step 5: Commit**

```bash
git add .claude/skills/type-system/
git commit -m "feat: add type-system Claude skill for type safety analysis"
```

---

## Task 9 Skill Content

The skill file content for `.claude/skills/type-system/SKILL.md`:

````markdown
---
name: type-system
description: Use when analyzing types, reviewing type safety, or strengthening the type system. Scans for 7 categories of type weakness and produces concrete before/after fixes.
---

# Type System Opportunity Analyzer

Analyze code for type system weaknesses. Produce concrete before/after transformations.

## When to Use

- Reviewing or creating TypeScript types/interfaces
- Before or after refactoring domain models
- Code review where type safety matters
- User asks to "strengthen types", "improve type safety", or "find type issues"

## Scan Categories (Priority Order)

### 1. Impossible States
Optional fields that are only valid in certain states. Fix with **discriminated unions**.

```typescript
// BAD: commentId exists on LIKE_ON_POST — impossible but representable
interface Notification { type: NotificationType; commentId?: string }

// GOOD: compiler enforces which fields exist per type
type Notification = CommentNotification | LikeNotification;
```

### 2. Trust Boundary Violations
Mappers returning `Record<string, unknown>` or `any`. Fix with **typed row interfaces**.

```typescript
// BAD: typo in column name compiles fine, fails silently at runtime
function mapUser(data: Partial<User>): Record<string, unknown> { ... }

// GOOD: typo is a compile error
function mapUser(data: Partial<User>): SupabaseUserUpdate { ... }
```

### 3. Unvalidated Data Flow
`as any` casts on API response data. Fix with **explicit join row types**.

### 4. Primitive Obsession — IDs
Multiple `string` params that are different entity IDs. Fix with **branded types**.

```typescript
// BAD: silently swapped
function block(blockerId: string, blockedId: string) { ... }

// GOOD: compile error on swap
function block(blockerId: UserId, blockedId: UserId) { ... }
// Still catches swap? No — need distinct BlockerId/BlockedId or param objects.
```

### 5. Repeated Inline Types
Same shape defined in 3+ places. Fix with **shared type extraction**.

### 6. Missing API Contracts
Inline anonymous return types on API functions. Fix with **named interfaces**.

### 7. Optional Fields That Are Always Present
Fields marked `?` that mappers always provide. Fix by **removing the `?`**.

## Output Format

For each finding:
```
### [Category] — [Short Description]
**Problem:** What's wrong and what bugs it allows.
**Location:** file:line
**Before:** current code
**After:** improved code
**Effort:** Low / Medium / High
```

## Common Mistakes

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| Branded IDs on every `string` | Noise without value for non-ID strings | Only brand entity IDs that appear as function params |
| Discriminated union for 2-state boolean | Overkill for `isRead: boolean` | Only use for 3+ states or correlated optional fields |
| Typing Supabase rows to match TS model | Hides the mapping layer; DB schema ≠ domain model | Type the DB row shape separately, map explicitly |
| Making all fields required | Breaks construction sites that build objects incrementally | Only require fields that are always present after the primary mapper |
| Branded IDs without constructor functions | Every consumer needs `as UserId` scattered everywhere | Provide `asUserId()` helpers, use only at trust boundaries |
````

---

## Dependency Graph

```
Task 1 (UserSummary)     — standalone
Task 2 (SupabaseUserUpdate) — standalone
Task 3 (Post required fields) — standalone
Task 4 (Join row types)  — standalone
Task 5 (NotificationRow) — standalone
Task 6 (Notification union) — depends on Task 5
Task 7 (Reaction union)  — standalone
Task 8 (Branded IDs)     — standalone (but benefits from Task 1)
Task 9 (Skill)           — standalone, best done last
```

Tasks 1-5, 7, 8 can all be done in parallel. Task 6 depends on Task 5. Task 9 should be last.
