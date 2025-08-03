import { onRequest } from 'firebase-functions/v2/https';
import admin from '../shared/admin';
import {
  executeFixStreakInfo,
  FixStreakInfoResult,
  fixSingleUserStreak,
  OptimizedFetchOptions,
} from './fixStreakInfo';
import { StreakInfo } from '../recoveryStatus/StreakInfo';
import { getCurrentSeoulTime, formatSeoulDateString } from '../shared/seoulTime';
import { getCurrentSeoulDate } from '../shared/calendar';

/**
 * Backup data structure for rollback capability
 */
interface StreakInfoBackup {
  userId: string;
  originalData: StreakInfo | null;
  backupTimestamp: Date;
}

/**
 * Enhanced result with backup information
 */
interface FixStreakInfoResultWithBackup extends FixStreakInfoResult {
  backupId?: string;
  rollbackCapable: boolean;
}

/**
 * Create backup of current StreakInfo data before migration
 */
async function createStreakInfoBackup(
  userIds: string[],
  backupId: string
): Promise<StreakInfoBackup[]> {
  console.log(`[FixStreakInfo] Creating backup for ${userIds.length} users...`);
  
  const backups: StreakInfoBackup[] = [];
  const db = admin.firestore();
  
  // Process in smaller chunks to avoid overwhelming Firestore
  const chunkSize = 100;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    
    const chunkBackups = await Promise.all(
      chunk.map(async (userId) => {
        try {
          const streakInfoRef = db
            .collection('users')
            .doc(userId)
            .collection('streakInfo')
            .doc('current');
          
          const doc = await streakInfoRef.get();
          const originalData = doc.exists ? (doc.data() as StreakInfo) : null;
          
          return {
            userId,
            originalData,
            backupTimestamp: getCurrentSeoulTime(),
          };
        } catch (error) {
          console.error(`[FixStreakInfo] Error backing up user ${userId}:`, error);
          return {
            userId,
            originalData: null,
            backupTimestamp: getCurrentSeoulTime(),
          };
        }
      })
    );
    
    backups.push(...chunkBackups);
    console.log(`[FixStreakInfo] Backed up chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(userIds.length / chunkSize)}`);
  }
  
  // Store backup in Firestore for persistence
  await storeBackupInFirestore(backups, backupId);
  
  console.log(`[FixStreakInfo] Backup completed: ${backups.length} users backed up`);
  return backups;
}

/**
 * Store backup data in Firestore for persistence
 */
async function storeBackupInFirestore(
  backups: StreakInfoBackup[],
  backupId: string
): Promise<void> {
  const db = admin.firestore();
  const backupRef = db.collection('streakInfoBackups').doc(backupId);
  
  // Store backup metadata
  await backupRef.set({
    backupId,
    createdAt: admin.firestore.Timestamp.fromDate(getCurrentSeoulTime()),
    totalUsers: backups.length,
    description: 'Backup before StreakInfo fix migration',
  });
  
  // Store individual user backups in subcollection
  const batchSize = 500;
  for (let i = 0; i < backups.length; i += batchSize) {
    const batch = db.batch();
    const batchBackups = backups.slice(i, i + batchSize);
    
    batchBackups.forEach((backup) => {
      const backupDocRef = backupRef.collection('userBackups').doc(backup.userId);
      batch.set(backupDocRef, {
        userId: backup.userId,
        originalData: backup.originalData,
        backupTimestamp: admin.firestore.Timestamp.fromDate(backup.backupTimestamp),
      });
    });
    
    await batch.commit();
  }
}

/**
 * Rollback StreakInfo data from backup
 */
export async function rollbackStreakInfo(backupId: string): Promise<{
  success: boolean;
  restoredUsers: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  console.log(`[FixStreakInfo] Starting rollback from backup: ${backupId}`);
  
  try {
    const db = admin.firestore();
    const backupRef = db.collection('streakInfoBackups').doc(backupId);
    
    // Verify backup exists
    const backupDoc = await backupRef.get();
    if (!backupDoc.exists) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    // Get all user backups
    const userBackupsSnapshot = await backupRef.collection('userBackups').get();
    const userBackups = userBackupsSnapshot.docs.map(doc => ({
      userId: doc.id,
      originalData: doc.data().originalData as StreakInfo | null,
    }));
    
    console.log(`[FixStreakInfo] Found ${userBackups.length} user backups to restore`);
    
    let restoredUsers = 0;
    const errors: Array<{ userId: string; error: string }> = [];
    
    // Restore in batches
    const batchSize = 500;
    for (let i = 0; i < userBackups.length; i += batchSize) {
      const batch = db.batch();
      const batchBackups = userBackups.slice(i, i + batchSize);
      
      batchBackups.forEach((backup) => {
        try {
          const streakInfoRef = db
            .collection('users')
            .doc(backup.userId)
            .collection('streakInfo')
            .doc('current');
          
          if (backup.originalData) {
            // Restore original data
            batch.update(streakInfoRef, {
              ...backup.originalData,
              lastCalculated: admin.firestore.Timestamp.fromDate(getCurrentSeoulTime()), // Update with Seoul time
            });
          } else {
            // User had no original data, delete the document
            batch.delete(streakInfoRef);
          }
          
          restoredUsers++;
        } catch (error) {
          errors.push({
            userId: backup.userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      
      await batch.commit();
      console.log(`[FixStreakInfo] Restored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userBackups.length / batchSize)}`);
    }
    
    console.log(`[FixStreakInfo] Rollback completed: ${restoredUsers} users restored, ${errors.length} errors`);
    
    return {
      success: true,
      restoredUsers,
      errors,
    };
    
  } catch (error) {
    console.error('[FixStreakInfo] Rollback failed:', error);
    return {
      success: false,
      restoredUsers: 0,
      errors: [{ userId: 'system', error: error instanceof Error ? error.message : String(error) }],
    };
  }
}

/**
 * Get all user IDs that have posting data (optimized version)
 */
async function getUserIdsWithPostingsOptimized(): Promise<string[]> {
  const db = admin.firestore();
  
  // Use collection group query to find all postings, then extract unique user IDs
  const postingsSnapshot = await db.collectionGroup('postings')
    .select() // Only get document IDs, not data
    .get();
  
  const userIds = new Set<string>();
  postingsSnapshot.docs.forEach(doc => {
    // Extract userId from document path: users/{userId}/postings/{postingId}
    const pathParts = doc.ref.path.split('/');
    if (pathParts.length >= 2 && pathParts[0] === 'users') {
      userIds.add(pathParts[1]);
    }
  });
  
  return Array.from(userIds);
}

/**
 * Enhanced migration execution with backup and rollback support
 */
export async function executeFixStreakInfoWithBackup(options: {
  dryRun?: boolean;
  maxUsers?: number;
  createBackup?: boolean;
  backupId?: string;
} = {}): Promise<FixStreakInfoResultWithBackup> {
  const { dryRun = false, maxUsers, createBackup = true, backupId } = options;
  const generatedBackupId = backupId || `backup_${formatSeoulDateString(getCurrentSeoulDate())}_${Date.now()}`;
  
  console.log(`[FixStreakInfo] Starting enhanced migration with backup support...`);
  console.log(`[FixStreakInfo] Options:`, { dryRun, maxUsers, createBackup, backupId: generatedBackupId });
  
  try {
    // Get all user IDs with posting data
    let userIds = await getUserIdsWithPostingsOptimized();
    
    if (maxUsers && maxUsers > 0) {
      userIds = userIds.slice(0, maxUsers);
      console.log(`[FixStreakInfo] Limited to first ${maxUsers} users for testing`);
    }
    
    console.log(`[FixStreakInfo] Found ${userIds.length} users with posting data`);
    
    // Create backup if requested and not in dry run mode
    if (createBackup && !dryRun && userIds.length > 0) {
      await createStreakInfoBackup(userIds, generatedBackupId);
    }
    
    // Execute main migration
    const result = await executeFixStreakInfo({ dryRun, maxUsers });
    
    return {
      ...result,
      backupId: createBackup ? generatedBackupId : undefined,
      rollbackCapable: createBackup && !dryRun,
    };
    
  } catch (error) {
    console.error('[FixStreakInfo] Enhanced migration failed:', error);
    throw error;
  }
}

/**
 * Validate migration results by spot-checking a sample of users
 */
async function validateMigrationResults(
  sampleSize: number = 10
): Promise<{
  validationPassed: boolean;
  checkedUsers: number;
  issues: Array<{ userId: string; issue: string }>;
}> {
  console.log(`[FixStreakInfo] Validating migration results with sample size: ${sampleSize}`);
  
  try {
    const userIds = await getUserIdsWithPostingsOptimized();
    const sampleUserIds = userIds.slice(0, Math.min(sampleSize, userIds.length));
    
    const issues: Array<{ userId: string; issue: string }> = [];
    
    for (const userId of sampleUserIds) {
      try {
        const db = admin.firestore();
        const streakInfoRef = db
          .collection('users')
          .doc(userId)
          .collection('streakInfo')
          .doc('current');
        
        const doc = await streakInfoRef.get();
        if (!doc.exists) {
          issues.push({ userId, issue: 'StreakInfo document does not exist' });
          continue;
        }
        
        const data = doc.data() as StreakInfo;
        
        // Basic validation checks
        if (data.currentStreak < 0) {
          issues.push({ userId, issue: 'currentStreak is negative' });
        }
        if (data.longestStreak < 0) {
          issues.push({ userId, issue: 'longestStreak is negative' });
        }
        if (data.originalStreak < 0) {
          issues.push({ userId, issue: 'originalStreak is negative' });
        }
        if (data.currentStreak > data.longestStreak) {
          issues.push({ userId, issue: 'currentStreak exceeds longestStreak' });
        }
        if (!data.status || !data.status.type) {
          issues.push({ userId, issue: 'status is missing or invalid' });
        }
        
      } catch (error) {
        issues.push({ 
          userId, 
          issue: `Validation error: ${error instanceof Error ? error.message : error}` 
        });
      }
    }
    
    const validationPassed = issues.length === 0;
    console.log(`[FixStreakInfo] Validation completed: ${validationPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`[FixStreakInfo] Checked ${sampleUserIds.length} users, found ${issues.length} issues`);
    
    return {
      validationPassed,
      checkedUsers: sampleUserIds.length,
      issues,
    };
    
  } catch (error) {
    console.error('[FixStreakInfo] Validation failed:', error);
    return {
      validationPassed: false,
      checkedUsers: 0,
      issues: [{ userId: 'system', issue: `Validation error: ${error}` }],
    };
  }
}

/**
 * HTTP Cloud Function to fix StreakInfo data
 * 
 * Endpoints:
 * POST /fixStreakInfo - Execute migration
 * POST /fixStreakInfo/rollback - Rollback from backup
 * POST /fixStreakInfo/validate - Validate migration results
 */
export const fixStreakInfoScript = onRequest(
  {
    timeoutSeconds: 540, // 9 minutes
    memory: '2GiB', // Increased memory for large datasets
  },
  async (req, res) => {
    console.log('[FixStreakInfo] HTTP function called:', req.method, req.path);
    
    if (req.method !== 'POST') {
      res.status(405).json({
        error: 'Method not allowed',
        message: 'Use POST to execute operations',
      });
      return;
    }
    
    try {
      const { action = 'migrate', ...options } = req.body || {};
      
      switch (action) {
        case 'migrate': {
          console.log('[FixStreakInfo] Executing migration with options:', options);
          const result = await executeFixStreakInfoWithBackup(options);
          
          res.status(200).json({
            success: true,
            message: 'StreakInfo fix migration completed',
            result,
          });
          break;
        }
        
        case 'rollback': {
          const { backupId } = options;
          if (!backupId) {
            res.status(400).json({
              error: 'Missing backupId',
              message: 'backupId is required for rollback operation',
            });
            return;
          }
          
          console.log('[FixStreakInfo] Executing rollback with backupId:', backupId);
          const result = await rollbackStreakInfo(backupId);
          
          res.status(200).json({
            success: result.success,
            message: result.success ? 'Rollback completed successfully' : 'Rollback failed',
            result,
          });
          break;
        }
        
        case 'validate': {
          const { sampleSize = 10 } = options;
          console.log('[FixStreakInfo] Executing validation with sampleSize:', sampleSize);
          const result = await validateMigrationResults(sampleSize);
          
          res.status(200).json({
            success: result.validationPassed,
            message: result.validationPassed ? 'Validation passed' : 'Validation found issues',
            result,
          });
          break;
        }
        
        case 'fixUser': {
          const { userId } = options;
          if (!userId) {
            res.status(400).json({
              error: 'Missing userId',
              message: 'userId is required for fixUser operation',
            });
            return;
          }
          
          const fetchOptions: OptimizedFetchOptions = {
            maxWorkingDays: options.maxWorkingDays || 30,
            earlyTerminationGap: options.earlyTerminationGap || 7,
            maxTotalPostings: options.maxTotalPostings || 200,
          };
          
          console.log('[FixStreakInfo] Executing single user fix for:', userId, 'with options:', fetchOptions);
          const result = await fixSingleUserStreak(userId, fetchOptions);
          
          res.status(200).json({
            success: result.success,
            message: result.success ? 'User streak fixed successfully' : 'User streak fix failed',
            result,
          });
          break;
        }
        
        default: {
          res.status(400).json({
            error: 'Invalid action',
            message: 'Supported actions: migrate, rollback, validate, fixUser',
          });
          break;
        }
      }
      
    } catch (error) {
      console.error('[FixStreakInfo] HTTP function error:', error);
      res.status(500).json({
        success: false,
        error: 'Operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);