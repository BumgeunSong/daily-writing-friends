# User Streak Migration Guide

## Purpose

This migration script initializes accurate `currentStreak` and `longestStreak` values for existing users based on their historical posting data.

## Why This Migration is Needed

1. **New Fields**: The `StreakInfo` interface now includes `currentStreak` and `longestStreak` fields
2. **Default Values**: New documents get created with `currentStreak: 0, longestStreak: 0`
3. **Historical Data**: Existing users may have significant historical streaks that should be calculated
4. **Performance**: Lazy calculation on first access could be slow for heavy users

## What the Migration Does

### ✅ **Safe Operations**
- **Read-only streak calculations** based on existing `postings` data
- **Selective updates** - only updates users who need it
- **Batch processing** - handles large user bases efficiently
- **Error isolation** - individual user failures don't stop the migration
- **Idempotent** - safe to run multiple times

### 🔍 **Migration Logic**
1. **Get all users** from the `users` collection
2. **Check existing streak data** - skip users who already have non-zero streaks
3. **Calculate accurate streaks** from historical `postings` data
4. **Update `streakInfo/current`** documents with calculated values
5. **Batch writes** using Firestore's 500-operation limit

### 📊 **What Gets Updated**
```typescript
// Only these fields are updated:
{
  currentStreak: number,     // Calculated from recent consecutive working days
  longestStreak: number,     // Calculated from all historical data
  lastContributionDate: string, // Most recent posting date (if exists)
  lastCalculated: Timestamp  // When this calculation was performed
}
```

## How to Run the Migration

### 1. Deploy the Function
```bash
npm run build
npm run deploy
```

### 2. Execute via HTTP Request
```bash
# Execute the migration
curl -X POST https://your-region-your-project.cloudfunctions.net/initializeUserStreaks \
  -H "Content-Type: application/json"
```

### 3. Monitor Execution
The function will log progress and return a detailed result:

```json
{
  "success": true,
  "message": "User streak migration completed successfully",
  "result": {
    "totalUsers": 1500,
    "processedUsers": 1500,
    "updatedUsers": 847,
    "skippedUsers": 623,
    "errorUsers": 30,
    "errors": [...],
    "executionTimeMs": 245000
  }
}
```

## Performance Characteristics

### **Batch Processing**
- **User batches**: 50 users processed in parallel per batch
- **Database batches**: 500 Firestore operations per batch
- **Sequential batches**: Batches processed sequentially to control load

### **Expected Performance**
- **~2-5 seconds per user** (depends on posting history)
- **~1000 users in 15-30 minutes**
- **Memory usage**: ~1GB for function execution
- **Timeout**: 9 minutes (HTTP function limit)

### **For Large User Bases (>5000 users)**
Consider running the migration in chunks:
1. Export user IDs in smaller groups
2. Run migration multiple times for different user segments
3. Use Firestore imports/exports for very large datasets

## Safety Features

### ✅ **Skip Logic**
Users are automatically skipped if they already have:
- `currentStreak > 0` OR `longestStreak > 0`

This makes the migration **idempotent** - safe to run multiple times.

### ✅ **Error Handling**
- Individual user failures are logged but don't stop the migration
- Detailed error reporting in the response
- Graceful degradation - partial success is still useful

### ✅ **No Data Loss Risk**
- Only reads from `postings` collection
- Only adds/updates streak fields in `streakInfo`
- Never deletes or modifies existing posting data

## Verification

### Check Migration Results
```typescript
// Query users with updated streaks
const usersWithStreaks = await admin.firestore()
  .collectionGroup('streakInfo')
  .where('currentStreak', '>', 0)
  .get();

console.log(`Users with current streaks: ${usersWithStreaks.size}`);
```

### Spot Check Individual Users
```typescript
// Check a specific user's streak data
const streakInfo = await admin.firestore()
  .doc('users/USER_ID/streakInfo/current')
  .get();

console.log('Streak data:', streakInfo.data());
```

## Rollback Strategy

If needed, you can reset streak fields:

```typescript
// Reset all streak data (emergency rollback)
const batch = admin.firestore().batch();
const streakDocs = await admin.firestore()
  .collectionGroup('streakInfo')
  .get();

streakDocs.forEach(doc => {
  batch.update(doc.ref, {
    currentStreak: 0,
    longestStreak: 0
  });
});

await batch.commit();
```

## Migration Status Tracking

The migration automatically creates logs that can be monitored:

### Cloud Function Logs
```bash
# View function execution logs
gcloud functions logs read initializeUserStreaks --limit=50
```

### Key Log Messages
- `[StreakMigration] Starting user streak initialization migration...`
- `[StreakMigration] Processing batch X/Y: N users`
- `[StreakMigration] Applied batch X: N updates`
- `[StreakMigration] Migration completed successfully`

## Post-Migration

After successful migration:

1. **Verify streak accuracy** for a sample of users
2. **Monitor application performance** - ensure no regressions
3. **Check user feedback** - streaks should now show historical data
4. **Optional cleanup** - remove migration function after confirmed success

## Troubleshooting

### Common Issues

#### **Timeout Errors**
- Run migration during low-traffic periods
- Consider processing in smaller chunks
- Monitor Cloud Function metrics

#### **Permission Errors**
- Ensure Cloud Function has Firestore read/write permissions
- Check IAM roles for the function service account

#### **Memory Issues**
- Large posting histories may cause memory pressure
- Consider increasing function memory allocation
- Process very active users separately if needed

### Emergency Stops

If you need to stop the migration:
1. **Cloud Function logs** will show current progress
2. **Re-run is safe** - migration will skip already-processed users
3. **Partial completion is OK** - already-updated users will have accurate streaks