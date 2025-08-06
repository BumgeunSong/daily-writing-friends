# Streak Recovery Notice Usage Example

## Simple Usage

Here's how to add the streak recovery notice to a post list:

```tsx
import { StreakRecoveryNotice } from '@/stats/components';

function PostList() {
  return (
    <div className="space-y-4">
      {/* Show streak recovery notice at the top */}
      <StreakRecoveryNotice onClickContent={() => {
        // Optional: Handle click to navigate to writing page
        // navigate('/board/write');
      }} />
      
      {/* Regular post cards below */}
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

## What it shows

### When user is eligible for recovery:

**Case 1: Needs 2+ posts**
- **Title**: "아직 죽지 않았어요!"
- **Content**: "매일 글쓰기를 놓치셨네요 ㅜ 하지만 내일까지 2개의 글을 쓰면 연속일수를 되살릴 수 있어요. 글 쓰고 연속 일수 살리러 가기 >"

**Case 2: Needs 1 post**
- **Title**: "딱 하나 남았어요!"
- **Content**: "글을 하나만 더 쓰면 연속 일수가 다시 되살아나요."

### When NOT to show:
- `status.type === 'onStreak'` (user is maintaining streak)
- `status.type === 'missed'` (recovery deadline passed)
- `status.type === 'eligible'` but `postsRequired - currentPosts <= 0` (already recovered)

## Data Structure

The hook uses this simplified StreakInfo model:

```typescript
interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastContributionDate: string; // YYYY-MM-DD
  lastCalculated: Timestamp;
  status: {
    type: 'onStreak' | 'eligible' | 'missed';
    postsRequired?: number;    // Only for 'eligible'
    currentPosts?: number;     // Only for 'eligible'
    deadline?: string;         // Only for 'eligible' (YYYY-MM-DD)
  };
}
```

## Implementation Details

- **Automatic**: The component handles all logic internally
- **Error handling**: Gracefully handles missing data or API errors
- **Performance**: Only fetches data once on mount
- **Clean**: Shows nothing when no notice is needed
- **Responsive**: Uses existing SystemPostCard styling

This is much simpler than the previous overcomplicated version and focuses only on what's needed for the specific SystemPostCard use case!