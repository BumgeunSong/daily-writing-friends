# Comment Style Data Generation - Setup Guide

## Overview

This implementation creates a system to automatically generate and store comment style data for active users, enabling personalized comment suggestions powered by AI.

## Features

- **Real-time Processing**: Automatically processes new comments as they're created
- **Backfill Support**: Processes existing comments for active users  
- **Dual Classification**: Analyzes both writing tone and emotional mood
- **Smart Caching**: Avoids duplicate LLM calls for the same posts
- **Cost Optimization**: Uses batch processing and caching to minimize API costs
- **Error Handling**: Robust error handling that doesn't break existing comment flow

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install @google/genai
```

### 2. Set Up Gemini API Key

Get your Gemini API key from Google AI Studio and store it securely:

```bash
# Set the secret (you'll be prompted to enter the API key)
firebase functions:secrets:set GEMINI_API_KEY

# Grant access to the secret for your functions
firebase functions:secrets:access GEMINI_API_KEY
```

### 3. Deploy Functions

Deploy the new functions:

```bash
firebase deploy --only functions:createCommentStyleData,functions:backfillCommentStyleDataForActiveUsers
```

### 4. Run Backfill (Optional)

If you have existing comments to process:

```bash
# Call the backfill HTTP function
curl -X POST https://your-region-your-project.cloudfunctions.net/backfillCommentStyleDataForActiveUsers
```

## Architecture

### Database Schema

#### `commentStyleData` Collection
```typescript
interface CommentStyleData {
  id: string;                    // Comment ID
  userId: string;               // Comment author
  postId: string;              // Post being commented on
  boardId: string;             // Board ID
  authorId: string;            // Post author ID
  authorNickname: string;      // Post author nickname
  userComment: string;         // Original comment text
  createdAt: Timestamp;        // Comment creation time
  processedAt: Timestamp;      // Processing time
}
```

**Note**: Post analysis fields (postSummary, postTone, postMood) have been removed. Comment suggestions are now generated based purely on user's comment history without post context analysis.

### Classification System

#### PostTone (Writer's Style)
1. **thoughtful** - 사려 깊은: Deep thinking and consideration
2. **warm** - 따뜻한: Kind and affectionate
3. **emotional** - 감정적인: Strong emotional expression
4. **humorous** - 유머러스한: Funny and light-hearted
5. **serious** - 진지한: Serious tone for important topics
6. **informal** - 비공식적인: Casual, friend-like conversation
7. **formal** - 공식적인: Professional and business-like
8. **optimistic** - 낙관적인: Positive and hopeful
9. **calm** - 평화로운: Peaceful and serene
10. **guiding** - 안내하는: Step-by-step guidance
11. **friendly** - 우호적인: Friendly and amicable

#### PostMood (Emotional Atmosphere)
1. **happy_uplifting** - Joy and hopeful outlook
2. **sad_gloomy** - Sadness, loneliness, grief
3. **tense_exciting** - Tension, excitement, suspense
4. **romantic_loving** - Deep connection, affection, passion
5. **mysterious_curious** - Wonder, curiosity, exploration
6. **funny_lighthearted** - Humor and entertainment
7. **peaceful_calm** - Tranquil and serene atmosphere

## Functions

### 1. `createCommentStyleData`

**Trigger**: Firestore document creation in `boards/{boardId}/posts/{postId}/comments/{commentId}`

**Process**:
1. Check if user is active for the board
2. Look for cached post analysis
3. If not cached, analyze post with Gemini (summary + tone + mood)
4. Create `commentStyleData` record
5. Cache analysis result for future use

**Error Handling**: Fails silently to not disrupt comment creation flow

### 2. `backfillCommentStyleDataForActiveUsers`

**Type**: HTTP function for manual execution

**Process**:
1. Get all active users from active board
2. For each user, get last 10 comments with post data
3. Extract unique posts to minimize LLM calls
4. Use Gemini batch processing for cost savings
5. Create `commentStyleData` records in batches
6. Cache all post analysis results

**Response**: Detailed progress report with success/error counts

## Usage Examples

### Query User's Comment Style Data

```typescript
// Get a user's comment style history
async function getUserCommentStyleData(userId: string, limit: number = 10) {
  const snapshot = await admin.firestore()
    .collection('commentStyleData')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
    
  return snapshot.docs.map(doc => doc.data() as CommentStyleData);
}
```

### Analyze Comment Patterns

```typescript
// Analyze user's commenting patterns by tone
async function analyzeUserTonePatterns(userId: string) {
  const comments = await getUserCommentStyleData(userId, 50);
  
  const toneCounts = comments.reduce((acc, comment) => {
    acc[comment.postTone] = (acc[comment.postTone] || 0) + 1;
    return acc;
  }, {} as Record<PostTone, number>);
  
  return toneCounts;
}
```

## Cost Estimation

### Gemini 2.5 Flash-lite Pricing (Ultra-Lightweight Model)
- **Input**: ~$0.01 per 1M input tokens (most cost-effective)
- **Output**: ~$0.04 per 1M output tokens
- **Note**: Gemini 2.5 Flash-lite is optimized for maximum speed with lowest cost

### Expected Costs
- **Backfill**: ~300 posts × 1K chars = $0.60 (one-time)
- **Monthly**: ~100 new comments × 1K chars = $0.40/month
- **With caching**: Significant reduction for posts with multiple comments

### Cost Optimization Features
- **Post caching**: Reuse analysis for posts with multiple comments
- **Batch processing**: 50% cost reduction for backfill operations  
- **Smart deduplication**: Process each unique post only once
- **Active user filtering**: Only process comments from active users

## Monitoring

### Cloud Logging Queries

```bash
# Monitor function execution
resource.type="cloud_function"
resource.labels.function_name=("createCommentStyleData" OR "backfillCommentStyleDataForActiveUsers")

# Monitor errors
resource.type="cloud_function"
severity>=ERROR
resource.labels.function_name="createCommentStyleData"

# Monitor Gemini API usage
textPayload:"Gemini API"
```

### Key Metrics to Track
- Function execution count and duration
- Gemini API call count and costs
- Cache hit/miss rates
- Error rates by function
- Backfill completion status

## Troubleshooting

### Common Issues

1. **Secret Access Error**
   ```
   Error: Secret GEMINI_API_KEY not found
   ```
   **Solution**: Ensure secret is set and function has access:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```

2. **Gemini API Rate Limits**
   ```
   Error: 429 Too Many Requests
   ```
   **Solution**: The service includes retry logic. If persistent, reduce batch sizes in config.

3. **Cache Permission Errors**
   ```
   Error: Permission denied on postProcessingCache
   ```
   **Solution**: Check Firestore security rules allow function access to the collection.

4. **Backfill Timeout**
   ```
   Error: Function execution took longer than 540000ms
   ```
   **Solution**: Reduce `PROCESSING_LIMITS.batchSize` in config.ts

### Testing

```typescript
// Test individual components
const geminiService = new GeminiService();
const result = await geminiService.generateSummaryToneMood("테스트 포스트 내용입니다.");
console.log(result);

// Test caching
const cacheService = new CacheService();
await cacheService.cachePostProcessing("test-post-id", result);
const cached = await cacheService.getCachedPostProcessing("test-post-id");
console.log(cached);
```

## Next Steps

After successful deployment, this data can be used for:
1. **Comment Suggestion Generation** (Part 2)
2. **User Writing Style Analysis**
3. **Content Recommendation Systems**
4. **Community Engagement Analytics**

The `commentStyleData` collection serves as the foundation for building personalized comment suggestion features.