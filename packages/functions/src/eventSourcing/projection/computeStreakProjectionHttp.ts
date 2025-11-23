import { Timestamp } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { computeUserStreakProjection } from './computeStreakProjection';

/**
 * HTTP endpoint for on-demand streak projection computation.
 *
 * Phase 2.1: Replaces direct cache reads with computed projections.
 * Serves both admin tools and app.
 *
 * Request: GET /computeUserStreakProjection?uid={userId}
 * Response: StreamProjectionPhase2 JSON
 */
export const computeUserStreakProjectionHttp = onRequest(
  {
    cors: true,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      // Get uid from query params
      const uid = req.query.uid as string;

      if (!uid) {
        res.status(400).json({
          error: 'Missing required parameter: uid',
        });
        return;
      }

      // Compute projection
      const projection = await computeUserStreakProjection(uid, Timestamp.now());

      // Return projection as JSON
      res.json(projection);
    } catch (error) {
      console.error('[ComputeProjectionHttp] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
