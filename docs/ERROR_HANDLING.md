# Error Handling & Monitoring Guide

## Overview

Comprehensive error handling strategy for the application, including error boundaries, Supabase write error tracking, React Query error monitoring with Sentry, and debugging practices.

## Error Handling Architecture

```
User action
  └── React Query mutation / Router loader
        └── executeTrackedWrite / throwOnError   (apps/web/src/shared/api/supabaseClient.ts)
              ├── SupabaseNetworkError  →  Sentry breadcrumb (warning)
              └── SupabaseWriteError   →  Sentry breadcrumb + captureException
                    └── Postgres code 42501 → special fingerprint "permission-denied"

React Query global cache
  └── QueryCache.onError → trackQueryError   (apps/web/src/shared/lib/queryErrorTracking.ts)
  └── MutationCache.onError → trackMutationError

Component tree errors
  └── ErrorBoundary   (apps/web/src/shared/components/ErrorBoundary.tsx)   — class-based
  └── PermissionErrorBoundary (apps/web/src/shared/components/PermissionErrorBoundary.tsx)
        — router error element, handles 403 / 503 / generic route errors
```

---

## Supabase Write Error Chain

**Location**: `apps/web/src/shared/api/supabaseClient.ts`

### Error Classes

```typescript
class SupabaseWriteError extends Error {
  postgrestError: PostgrestError;  // code, message, details, hint
}

class SupabaseNetworkError extends Error {
  postgrestError: PostgrestError;
}
```

`SupabaseNetworkError` is thrown when the Postgres error has no `code` and the message matches a network-failure pattern (`'Load failed'`, `'Failed to fetch'`, `'NetworkError'`, etc.).

`SupabaseWriteError` is thrown for all other Postgres errors, including RLS violations (code `42501`).

### throwOnError

```typescript
throwOnError(result: { error: PostgrestError | null }, operation?: string): void
```

Called after every Supabase query that should raise on failure.

- No error → returns normally.
- Network error → adds a Sentry breadcrumb at `warning` level, throws `SupabaseNetworkError`.
- Other error → adds a Sentry breadcrumb at `error` level, sets Sentry context `supabaseError`, calls `Sentry.captureException`, throws `SupabaseWriteError`.  
  For Postgres code `42501` (RLS permission denied), sets a custom Sentry fingerprint `['supabase', 'permission-denied', operation]`.

### executeTrackedWrite

```typescript
executeTrackedWrite(
  operation: string,
  fn: () => Promise<{ error: PostgrestError | null }>,
): Promise<void>
```

Wraps a single Supabase write with:

1. A Sentry breadcrumb at start (`'Supabase write started: <operation>'`).
2. Timing — if the write takes ≥ 1 000 ms, adds a `warning` breadcrumb and a `console.warn`.
3. Delegates to `throwOnError` for error reporting and throwing.

**Usage**:

```typescript
await executeTrackedWrite('insertLike', () =>
  supabase.from('likes').insert({ post_id: postId, user_id: userId }),
);
```

### Postgres Error Code Reference

| Code | Meaning | Thrown as |
|------|---------|-----------|
| `42501` | Insufficient privilege (RLS violation) | `SupabaseWriteError` |
| `23505` | Unique violation (duplicate key) | `SupabaseWriteError` |
| `23503` | Foreign key violation | `SupabaseWriteError` |
| `42P01` | Undefined table | `SupabaseWriteError` |
| *(empty)* | Network / connectivity failure | `SupabaseNetworkError` |

---

## React Query Global Error Tracking

**Location**: `apps/web/src/shared/lib/queryErrorTracking.ts`  
**Wired in**: `apps/web/src/shared/lib/queryClient.ts`

The `QueryClient` is created with `QueryCache` and `MutationCache` callbacks that automatically call `trackQueryError` / `trackMutationError` for every failed query or mutation — no per-query `onError` needed.

```typescript
// queryClient.ts (simplified)
const queryCache = new QueryCache({
  onError: (error, query) => trackQueryError(error, query),
});
const mutationCache = new MutationCache({
  onError: (error, _vars, _ctx, mutation) => trackMutationError(error, mutation),
});
```

### trackQueryError

For each failing query it:

1. Redacts PII from query keys that match `REDACTED_QUERY_KEY_PREFIXES` (e.g. `userPostSearch`).
2. Handles iOS IndexedDB connection errors at `warning` level (breadcrumb only; full Sentry report only after 3 retries).
3. Adds a Sentry breadcrumb and sets Sentry context and tags with the query key, retry count, and user id.
4. For `FirebaseError` (legacy path, kept for safety): routes to `handleFirebaseQueryError`.
5. For all other errors: calls `captureQueryError` which uses `Sentry.captureException` with a fingerprint derived from the query key.

### trackMutationError

Same structure as `trackQueryError` but for mutations. Uses `mutation.options.mutationKey` for the description.

### Manual Breadcrumbs

```typescript
import { addSentryBreadcrumb } from '@/sentry';

addSentryBreadcrumb(
  'User started editing post',
  'user-action',
  { postId, boardId },
  'info',
);
```

### Manual Context / Tags

```typescript
import { setSentryContext, setSentryTags } from '@/sentry';

setSentryContext('currentOperation', {
  action: 'saving-post',
  boardId,
  postId,
});

setSentryTags({
  feature: 'post-editor',
  userRole: 'member',
});
```

---

## Error Boundaries

### ErrorBoundary (`apps/web/src/shared/components/ErrorBoundary.tsx`)

A class-based React error boundary that catches **component tree** JavaScript errors.

**Props**:

```typescript
interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error) => ReactNode);
  children: ReactNode;
  context?: string;  // Optional label added to Sentry tags/context
}
```

**Behavior**: On `componentDidCatch`, sets Sentry tags (`errorBoundary`, `errorLocation`), sets context (`errorBoundary.componentStack`), and calls `Sentry.captureException`.

**Usage**:

```typescript
<ErrorBoundary context="post-editor" fallback={<ErrorFallback />}>
  <PostEditor />
</ErrorBoundary>
```

### PermissionErrorBoundary (`apps/web/src/shared/components/PermissionErrorBoundary.tsx`)

A **React Router error element** (uses `useRouteError()`) — not a class-based boundary. Attach it to a route's `errorElement` prop.

It handles three cases:

| HTTP Status | UI shown |
|-------------|----------|
| `503` | 네트워크 오류 dialog — retry or go home |
| `403` | 읽기 권한 없음 dialog — go home |
| Other / non-Response | Generic error page with back button |

Loaders should `throw new Response(message, { status: 403 })` or `throw new Response(message, { status: 503 })` to trigger the appropriate dialog.

### Other Boundaries

| Component | Location | Purpose |
|-----------|----------|---------|
| `CopyErrorBoundary` | `apps/web/src/post/components/CopyErrorBoundary.tsx` | Handles copy-to-clipboard failures |
| `NotificationsErrorBoundary` | `apps/web/src/notification/components/NotificationsErrorBoundary.tsx` | Isolates notification errors |

---

## Sentry User Identification

**Location**: `apps/web/src/sentry.ts`, `apps/web/src/shared/hooks/useAuth.tsx`

`AuthProvider` calls `setSentryUser` on every auth state change via `syncUserState`:

- On sign-in: sets `{ uid, email, displayName }`.
- On sign-out: calls `setSentryUser(null)` to clear user context.

---

## Error Handling Best Practices

### 1. Use executeTrackedWrite for Supabase Writes

Always use `executeTrackedWrite` (or at minimum `throwOnError`) instead of checking `.error` manually:

```typescript
// Good
await executeTrackedWrite('deleteComment', () =>
  supabase.from('comments').delete().eq('id', commentId),
);

// Avoid
const { error } = await supabase.from('comments').delete().eq('id', commentId);
if (error) console.error(error); // no Sentry, no breadcrumb
```

### 2. Throw Typed Route Errors from Loaders

```typescript
// In a loader
const { data, error } = await supabase.from('posts').select('*').eq('board_id', boardId);

if (error?.code === '42501') {
  throw new Response('이 기수에 참여하지 않아서 글을 읽을 수 없어요.', { status: 403 });
}
if (!navigator.onLine || isNetworkError(error)) {
  throw new Response('네트워크 연결에 문제가 있어요.', { status: 503 });
}
```

### 3. Capture Errors with Context

```typescript
try {
  await savePost(data);
} catch (error) {
  Sentry.withScope((scope) => {
    scope.setContext('postData', { boardId, postId });
    scope.setTag('operation', 'save-post');
    Sentry.captureException(error);
  });
  throw error;
}
```

### 4. Handle Async Errors in React Query

React Query errors are captured automatically by the global `QueryCache` / `MutationCache`. Add `meta` for extra Sentry context when needed:

```typescript
useQuery({
  queryKey: ['posts', boardId],
  queryFn: fetchPosts,
  meta: {
    feature: 'board-view',
    errorContext: 'Loading posts',
  },
});
```

### 5. Offline / Network Errors

```typescript
if (!navigator.onLine) {
  toast.error('You appear to be offline. Please check your connection.');
  return;
}
```

---

## Debugging Guide

### Reading Sentry Errors

1. **Check User Context**: Identify affected user (`uid`, `email`)
2. **Review Breadcrumbs**: Trace the sequence — `supabase.write started`, any slow-write warning, then `supabase.write failed`
3. **Examine `supabaseError` Context**: `code`, `message`, `details`, `hint`, `operation`
4. **Check Tags**: `query.key`, `error.source`
5. **Fingerprint**: `['supabase', 'permission-denied', '<operation>']` groups all RLS errors for one operation

### Common Issues and Solutions

#### "Insufficient privilege" / RLS violation (Postgres code 42501)

This is a Row-Level Security policy failure. In Sentry it appears as `SupabaseWriteError` with `code: '42501'`.

Debugging steps:
1. Confirm the user is authenticated (`auth.uid()` is set).
2. Check the relevant RLS policy in `supabase/migrations/` or Supabase Studio.
3. Verify the user has the required row in `user_board_permissions` or equivalent.
4. Review the `supabaseError` Sentry context for `operation` to identify which table/mutation failed.

#### "Failed to fetch" / "Load failed" (SupabaseNetworkError)

- Check network context in Sentry (`navigator.onLine` at time of error).
- Verify Supabase project status.
- Review request URL and method via breadcrumbs.

#### "TypeError" in components

- Check for null/undefined data (e.g., missing `?.` guards).
- Verify data schema matches query result shape.
- Add optional chaining or default values.

---

## Error Types Reference

### Application Errors

| Class | Location | When thrown |
|-------|----------|-------------|
| `SupabaseWriteError` | `apps/web/src/shared/api/supabaseClient.ts` | Any Postgres error with a non-empty code |
| `SupabaseNetworkError` | `apps/web/src/shared/api/supabaseClient.ts` | Network/connectivity failures (empty code) |

### Error Severity Levels

- **Fatal**: App crashes, data loss risks
- **Error**: Feature failures, broken flows
- **Warning**: Degraded experience, recoverable errors
- **Info**: Non-critical issues, performance concerns

---

## Testing Error Handling

### Manual Testing

1. Disconnect network to test offline handling.
2. Use browser dev tools to block Supabase requests.
3. Modify RLS policies in Supabase Studio to test 42501 errors.
4. Inject errors in development for boundary testing.

### Automated Testing

```typescript
// Test error boundary
it('handles component errors gracefully', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary fallback={<div>Error occurred</div>}>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Error occurred')).toBeInTheDocument();
});

// Test throwOnError
it('throws SupabaseWriteError for Postgres errors', () => {
  const error = { message: 'conflict', code: '23505', details: '', hint: '' };
  expect(() => throwOnError({ error })).toThrow(SupabaseWriteError);
});
```