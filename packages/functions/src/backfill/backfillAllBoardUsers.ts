/**
 * Cloud Function to backfill all users with write permission to a specific board
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import admin from '../shared/admin';
import { runBackfillProcess } from './index';

// Set global options
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

interface BackfillAllBoardUsersRequest {
  boardId: string;
  dryRun?: boolean;
  maxUsers?: number; // Limit for safety
  asOf?: string; // Optional ISO string (e.g., 2025-08-11T23:59:59+09:00)
}

interface BackfillAllBoardUsersResponse {
  boardId: string;
  totalBoardUsers: number;
  usersWithData: number;
  usersWithoutData: number;
  backfillResults: {
    userId: string;
    nickname?: string;
    success: boolean;
    finalState?: unknown;
    stats?: unknown;
    error?: string;
  }[];
  summary: {
    successful: number;
    failed: number;
    skipped: number;
  };
}

/**
 * Get all users with write permission to a specific board
 */
async function fetchUsersWithBoardPermission(boardId: string) {
  try {
    const usersSnapshot = await admin
      .firestore()
      .collection('users')
      .where(`boardPermissions.${boardId}`, '==', 'write')
      .get();

    const users: Array<{
      uid: string;
      realName?: string;
      nickname?: string;
      email?: string;
    }> = [];

    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        realName: userData.realName,
        nickname: userData.nickname,
        email: userData.email,
      });
    });

    return users;
  } catch (error) {
    console.error('Error fetching users with board permission:', error);
    throw error;
  }
}

export const backfillAllBoardUsersHttp = onRequest(
  {
    cors: true,
    timeoutSeconds: 3600, // 1 hour timeout
  },
  async (request, response) => {
    console.log('Starting backfill for all board users...');

    try {
      const body = request.body as BackfillAllBoardUsersRequest;

      if (!body.boardId) {
        response.status(400).json({
          error: 'boardId is required',
        });
        return;
      }

      const { boardId, dryRun = false, maxUsers = 50 } = body;
      // Parse optional asOf
      let asOfDate = new Date();
      if (body.asOf) {
        const parsed = new Date(body.asOf);
        if (!isNaN(parsed.getTime())) {
          asOfDate = parsed;
        } else {
          console.warn(`Invalid asOf provided: ${body.asOf}. Falling back to now.`);
        }
      }

      console.log(
        `Backfilling board: ${boardId}, dryRun: ${dryRun}, maxUsers: ${maxUsers}, asOf: ${asOfDate.toISOString()}`,
      );

      // Step 1: Get all users with write permission to the board
      const boardUsers = await fetchUsersWithBoardPermission(boardId);

      if (boardUsers.length === 0) {
        response.json({
          boardId,
          totalBoardUsers: 0,
          usersWithData: 0,
          usersWithoutData: 0,
          backfillResults: [],
          summary: { successful: 0, failed: 0, skipped: 0 },
        } as BackfillAllBoardUsersResponse);
        return;
      }

      console.log(`Found ${boardUsers.length} users with write permission to board ${boardId}`);

      // Limit users for safety
      const usersToProcess = boardUsers.slice(0, maxUsers);
      if (boardUsers.length > maxUsers) {
        console.log(`Limited to first ${maxUsers} users for safety`);
      }

      // Step 2: Test which users have posting data (dry run first)
      const usersWithData: typeof boardUsers = [];
      const usersWithoutData: typeof boardUsers = [];

      for (const user of usersToProcess) {
        try {
          console.log(`Testing user ${user.uid} (${user.nickname}) for posting data...`);

          const testResult = await runBackfillProcess({
            userId: user.uid,
            asOfDate,
            dryRun: true,
          });

          if (testResult.stats.postsProcessed > 0) {
            console.log(`✅ User ${user.uid} has ${testResult.stats.postsProcessed} posts`);
            usersWithData.push(user);
          } else {
            console.log(`⚪ User ${user.uid} has no posting data`);
            usersWithoutData.push(user);
          }
        } catch (error) {
          console.log(`❌ Error testing user ${user.uid}:`, error);
          usersWithoutData.push(user);
        }
      }

      console.log(
        `Users with data: ${usersWithData.length}, without data: ${usersWithoutData.length}`,
      );

      // Step 3: Run actual backfill for users with data
      const backfillResults: BackfillAllBoardUsersResponse['backfillResults'] = [];
      let successCount = 0;
      let failCount = 0;

      for (const user of usersWithData) {
        try {
          console.log(`Backfilling user ${user.uid} (${user.nickname})...`);

          const result = await runBackfillProcess({
            userId: user.uid,
            asOfDate,
            dryRun,
          });

          backfillResults.push({
            userId: user.uid,
            nickname: user.nickname,
            success: true,
            finalState: result.finalState,
            stats: result.stats,
          });

          successCount++;

          console.log(
            `✅ Backfill successful for ${user.uid}: ${result.finalState.currentStreak} streak`,
          );
        } catch (error) {
          console.error(`❌ Backfill failed for ${user.uid}:`, error);

          backfillResults.push({
            userId: user.uid,
            nickname: user.nickname,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });

          failCount++;
        }
      }

      const responseData: BackfillAllBoardUsersResponse = {
        boardId,
        totalBoardUsers: boardUsers.length,
        usersWithData: usersWithData.length,
        usersWithoutData: usersWithoutData.length,
        backfillResults,
        summary: {
          successful: successCount,
          failed: failCount,
          skipped: usersWithoutData.length,
        },
      };

      console.log('Backfill complete:', responseData.summary);
      response.json(responseData);
    } catch (error) {
      console.error('Error in backfillAllBoardUsers:', error);
      response.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
