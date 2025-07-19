# Writing History Feature

## Overview
Tracks daily writing statistics, achievements, and contribution analytics for users in the writing community platform.

## Functions

### Core Tracking
- **`createWritingHistoryOnPostCreated`**: Creates daily writing history entries when users post
- **`deleteWritingHistoryOnPostDeleted`**: Removes writing history entries when posts are deleted
- **`updateWritingHistoryByBatch`**: Batch updates for writing statistics

### Analytics & Achievements
- **`createBadges`**: Generates achievement badges based on writing activity
- **`createContributions`**: Tracks user contribution statistics (similar to GitHub contributions)

## Types
- `WritingHistory`: Interface for daily writing statistics and history data

## Features

### Daily Writing Tracking
- Records writing activity by date
- Tracks post count, word count, and engagement metrics
- Integrates with streak recovery system

### Achievement System
- Generates badges for writing milestones
- Tracks consecutive writing days
- Celebrates user achievements

### Contribution Analytics
- Visual contribution graph data
- Writing frequency analysis
- Monthly and yearly statistics

## Usage
```typescript
import { 
  createWritingHistoryOnPostCreated,
  createBadges,
  createContributions 
} from './writingHistory';

// Functions are automatically triggered by Firestore events
```

## Data Structure
Writing history is stored in `users/{userId}/writingHistories/{date}` with:
- Date of writing activity
- Number of posts created
- Total word count  
- Engagement metrics
- Achievement progress

## Testing
Run tests from the functions directory:
```bash
npm test -- --testPathPattern=writingHistory
```

## Related Features
- **recoveryStatus**: Streak calculations and recovery logic
- **postings**: Post creation events trigger history updates
- **notifications**: Activity notifications integrate with history