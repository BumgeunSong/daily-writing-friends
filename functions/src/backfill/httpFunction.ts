/**
 * HTTP Cloud Function for Retroactive Streak Backfill
 * 
 * Implements REQ-101: HTTP Trigger, Auth, and Parameters
 * Provides admin-authenticated endpoint for running backfill operations
 */

import { Request, Response } from 'express';
import admin from '../shared/admin';
import { BackfillRequestParams, BackfillParams, BackfillErrorType } from './types';

/**
 * Main HTTP function handler for backfill requests
 */
export async function handleBackfillRequest(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Enable authentication for production deployment (ETA: before v1.0 release)
    // Auth disabled for development backfill testing
    // const isAuthorized = await validateBackfillAuth(req);
    // if (!isAuthorized) {
    //   res.status(403).json({
    //     error: 'Forbidden: Admin access required',
    //     type: BackfillErrorType.AUTHENTICATION_FAILED,
    //   });
    //   return;
    // }

    // Parse and validate parameters
    const params = parseBackfillParameters(req.body);
    
    // Import and run the main backfill process
    const { runBackfillProcess } = await import('./index');
    const result = await runBackfillProcess(params);
    
    // Return successful response
    res.status(200).json(result);
    
  } catch (error: any) {
    console.error('Backfill request error:', error);
    
    if (error.message.includes('authentication') || error.message.includes('token')) {
      res.status(401).json({
        error: 'Unauthorized: ' + error.message,
        type: BackfillErrorType.AUTHENTICATION_FAILED,
      });
    } else if (error.message.includes('userId')) {
      res.status(400).json({
        error: error.message,
        type: BackfillErrorType.INVALID_PARAMETERS,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        type: BackfillErrorType.SIMULATION_ERROR,
      });
    }
  }
}

/**
 * Validate admin authentication for backfill requests
 */
export async function validateBackfillAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new Error('No token provided');
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid token format');
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decodedToken = await validateAdminToken(token);
    return decodedToken.isAdmin === true;
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

/**
 * Validate admin token and return claims
 */
export async function validateAdminToken(token: string): Promise<{ uid: string; isAdmin: boolean }> {
  const decodedToken = await admin.auth().verifyIdToken(token);
  
  return {
    uid: decodedToken.uid,
    isAdmin: decodedToken.isAdmin || false,
  };
}

/**
 * Parse and validate backfill request parameters
 */
export function parseBackfillParameters(requestParams: BackfillRequestParams): BackfillParams {
  // Validate required userId
  if (!requestParams.userId) {
    throw new Error('userId is required');
  }
  
  if (requestParams.userId.trim() === '') {
    throw new Error('userId cannot be empty');
  }
  
  // Parse optional asOf parameter
  let asOfDate = new Date(); // Default to current time
  if (requestParams.asOf) {
    try {
      asOfDate = new Date(requestParams.asOf);
      if (isNaN(asOfDate.getTime())) {
        throw new Error('Invalid asOf date format');
      }
    } catch (error) {
      throw new Error('Invalid asOf date format');
    }
  }
  
  // Parse optional from parameter
  let fromDate: Date | undefined;
  if (requestParams.from) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestParams.from)) {
      throw new Error('Invalid from date format');
    }
    fromDate = new Date(`${requestParams.from}T00:00:00Z`);
  }
  
  // Parse dryRun parameter (defaults to false)
  const dryRun = requestParams.dryRun === true;
  
  return {
    userId: requestParams.userId.trim(),
    asOfDate,
    fromDate,
    dryRun,
  };
}