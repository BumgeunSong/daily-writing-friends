# Error Handling & Monitoring Guide

## Overview
Comprehensive error handling strategy for the application, including error boundaries, monitoring with Sentry, network error tracking, and debugging practices.

## Error Handling Architecture

### Error Boundaries
React Error Boundaries catch JavaScript errors in component trees:
- **ErrorBoundary.tsx**: Generic error boundary for all components
- **CopyErrorBoundary.tsx**: Specialized for copy functionality errors
- **PermissionErrorBoundary.tsx**: Handles Firebase permission errors
- **NotificationsErrorBoundary.tsx**: Notification-specific error handling

### Error Monitoring with Sentry

#### 1. User Identification
- **Location**: `src/sentry.ts`, `src/shared/hooks/useAuth.tsx`
- **Features**:
  - Automatic user identification on login (userId, email, displayName)
  - User context cleared on logout
  - Email addresses partially masked for privacy

#### 2. Network Error Tracking
- **Location**: `src/shared/utils/networkErrorTracking.ts`
- **Features**:
  - Global fetch interceptor captures all network requests
  - Detailed error context including:
    - URL, method, status codes
    - Network connectivity status
    - Connection quality (if available)
    - Request duration
    - User agent information
  - Firebase-specific error handling
  - Custom fingerprinting for better error grouping

#### 3. Navigation & User Action Tracking
- **Location**: `src/shared/hooks/useNavigationTracking.ts`
- **Features**:
  - Automatic breadcrumb trail of user navigation
  - Click tracking for buttons, links, and forms
  - Page context in all errors
  - Last user action before error occurrence

#### 4. Enhanced Error Boundaries
- **Location**: `src/shared/components/ErrorBoundary.tsx`
- **Features**:
  - Sentry integration with component stack traces
  - Custom context and tags for error location
  - Different severity levels based on error type

## How Network Errors Are Now Tracked

### Before (Your Problem)
```
TypeError: Failed to fetch
```
No context about what failed, when, or why.

### After (With Enhanced Tracking)
```
Network request failed: POST https://firebaseremoteconfig.googleapis.com/...
Error: Failed to fetch
Online: true
Duration: 5234ms

Context:
- User ID: abc123
- Current Page: Board
- Last Action: User clicked: Button: Save Post
- Network Status: online
- Connection Type: 4g
- Firebase Service: Remote Config
```

## Error Grouping

Errors are now grouped by:
1. **Firebase Errors**: Grouped by service (Firestore, Auth, Storage, etc.)
2. **Network Errors**: Grouped by URL pattern and method
3. **Permission Errors**: All Firebase permission errors grouped together
4. **Timeout Errors**: All timeout-related errors grouped

## Finding Root Causes

With the new implementation, you can now:

1. **Check User Context**: See which user experienced the error
2. **Review Breadcrumbs**: See the exact sequence of actions before the error
3. **Analyze Network State**: Check if user was offline or had poor connection
4. **Identify Patterns**: Errors are grouped by type for easier pattern recognition
5. **Debug Firebase Issues**: Specific context for Firebase service failures

## Usage in Your Code

### Manual Breadcrumb Addition
```typescript
import { addSentryBreadcrumb } from '@/sentry';

addSentryBreadcrumb(
  'User started editing post',
  'user-action',
  { postId, boardId },
  'info'
);
```

### Manual Context Setting
```typescript
import { setSentryContext, setSentryTags } from '@/sentry';

setSentryContext('currentOperation', {
  action: 'saving-post',
  boardId,
  postId,
});

setSentryTags({
  feature: 'post-editor',
  userRole: 'member'
});
```

## Monitoring Dashboard Tips

In your Sentry dashboard, you can now:
1. Filter by user ID to see all errors for a specific user
2. Filter by tags (network.url_pattern, network.online, errorType)
3. View breadcrumb trails to reproduce user journey
4. See network conditions when errors occurred
5. Group similar Firebase errors together

## Error Handling Best Practices

### 1. Use Error Boundaries
Wrap feature components with appropriate error boundaries:
```typescript
<ErrorBoundary context="post-editor" fallback={<ErrorFallback />}>
  <PostEditor />
</ErrorBoundary>
```

### 2. Capture Errors with Context
Always include context when capturing exceptions:
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

### 3. Handle Async Errors in React Query
Use onError callbacks in mutations and queries:
```typescript
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    Sentry.captureException(error, {
      tags: { feature: 'post-creation' },
      context: { boardId, userId }
    });
  }
});
```

### 4. Network Error Handling
Network errors are automatically tracked, but add context for specific operations:
```typescript
import { trackUserAction } from '@/shared/utils/networkErrorTracking';

// Before critical operations
trackUserAction('save', 'Post Draft');
```

### 5. Firebase Error Patterns
Common Firebase errors and how to handle them:

#### Permission Errors
```typescript
if (error.code === 'permission-denied') {
  // Show user-friendly message
  toast.error('You don\'t have permission to perform this action');
  // Log with context
  Sentry.captureException(error, {
    level: 'warning',
    tags: { errorType: 'firebase-permission' }
  });
}
```

#### Network/Offline Errors
```typescript
if (!navigator.onLine) {
  toast.error('You appear to be offline. Please check your connection.');
  return;
}
```

## Error Types Reference

### Application Errors
- **ValidationError**: Input validation failures
- **AuthenticationError**: Login/auth failures
- **PermissionError**: Unauthorized access attempts
- **NetworkError**: Fetch/API failures
- **FirebaseError**: Firebase service errors

### Error Severity Levels
- **Fatal**: App crashes, data loss risks
- **Error**: Feature failures, broken flows
- **Warning**: Degraded experience, recoverable errors
- **Info**: Non-critical issues, performance concerns

## Debugging Guide

### Reading Sentry Errors
1. **Check User Context**: Identify affected user
2. **Review Breadcrumbs**: Trace user actions
3. **Examine Tags**: Filter by feature/operation
4. **Analyze Stack Trace**: Locate error source
5. **Check Network Context**: Verify connectivity issues

### Common Issues and Solutions

#### "Failed to fetch" / "Load failed"
- Check network context in Sentry
- Verify Firebase service status
- Review request URL and method
- Check user online status

#### "Missing or insufficient permissions"

**Enhanced Context in Sentry:**
When permission errors occur, Sentry now captures:
- **Operation type**: read/write/create/update/delete
- **Collection & Document**: Exact path being accessed
- **User state**: Authenticated status and user ID
- **Permission details**: Current vs required permissions
- **Debug hints**: Likely causes and solutions

**Common Permission Scenarios:**

1. **Board Access (`boards/{boardId}`)**
   - **Required**: User authenticated + `boardPermissions[boardId]` = 'read' or 'write'
   - **Check**: User's `boardPermissions` field in Firestore
   - **Debug**: Look for `availablePermissions` in Sentry context

2. **Post Reading (`boards/{boardId}/posts/{postId}`)**
   - **Required**: User authenticated + (post is PUBLIC OR user is author)
   - **Check**: Post's `visibility` field and `authorId`
   - **Debug**: Verify post visibility status in Sentry context

3. **User Data (`users/{userId}`)**
   - **Required**: User can only access their own data
   - **Check**: `userId` matches authenticated user
   - **Debug**: Compare `userId` in path with authenticated user ID

**Debugging Steps:**
1. Check Sentry's `firebasePermission` context for:
   - Exact operation and path
   - User authentication state
   - Additional info with specific reason
2. Review console logs for detailed debug hints
3. Verify user's permissions in Firestore console
4. Check authentication state in browser: `firebase.auth().currentUser`

#### "TypeError" in components
- Check for null/undefined data
- Verify data schema matches expectations
- Add optional chaining or default values

## Testing Error Handling

### Manual Testing
1. Disconnect network to test offline handling
2. Use browser dev tools to block requests
3. Modify Firebase rules to test permission errors
4. Inject errors in development for boundary testing

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
```

## Next Steps

### Immediate Improvements
1. Add custom breadcrumbs in critical user flows
2. Set context for complex operations
3. Create alerts for specific error patterns
4. Add user feedback mechanism for errors

### Long-term Enhancements
1. Implement error recovery strategies
2. Add performance monitoring
3. Create error dashboard for team
4. Implement error budget tracking