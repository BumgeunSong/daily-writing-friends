/**
 * HTTP Cloud Function for Retroactive Streak Backfill
 * 
 * REQ-101: Admin-authenticated HTTP endpoint for per-user backfill operations
 * Provides secure access to reconstruct streak states from historical data.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { handleBackfillRequest } from './httpFunction';

/**
 * HTTP Cloud Function for retroactive streak backfill
 * 
 * Admin-only endpoint that reconstructs user streak states from historical postings.
 * Supports dry-run mode for safe testing and validation.
 * 
 * Request body:
 * - userId (string, required): Target user ID
 * - dryRun (boolean, optional): Preview mode without writes (default: false)
 * - from (string, optional): Start date YYYY-MM-DD (default: earliest post)
 * - asOf (string, optional): End timestamp in KST (default: now)
 * 
 * Response:
 * - finalState: Computed streak status and counters
 * - recoveryEvents: List of recovery attempts with deterministic IDs
 * - stats: Processing metrics and performance data
 * 
 * Authentication: Requires Firebase Auth token with admin custom claim
 */
export const retroactiveBackfillHttp = onRequest({
  timeoutSeconds: 540, // 9 minutes (within Cloud Function limits)
  memory: '1GiB',
  maxInstances: 10,
  cors: [
    /firebase\.com$/,
    /web\.app$/,
    /firebaseapp\.com$/,
    'http://localhost:3000',
    'http://localhost:5173'
  ],
}, async (req, res) => {
  // Set CORS headers for development
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }


  // Delegate to main handler
  await handleBackfillRequest(req as any, res as any);
});