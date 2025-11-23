/**
 * RecoveryId Generation Utilities
 *
 * Provides deterministic hash generation for recovery history records using FNV-1a algorithm.
 * Per REQ-110: recoveryId = hash(missedDate, recoveryDate)
 * 
 * Uses FNV-1a for consistent, deterministic hashing across function invocations.
 */

import { Timestamp } from 'firebase-admin/firestore';

// FNV-1a 32-bit constants
const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

/**
 * FNV-1a 32-bit hash implementation
 * Produces consistent hash values for identical inputs
 */
export function fnv1aHash32(data: string): string {
  let hash = FNV_OFFSET_BASIS_32;
  
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = (hash * FNV_PRIME_32) >>> 0; // Ensure 32-bit unsigned
  }
  
  return hash.toString(16).padStart(8, '0');
}

/**
 * Generate deterministic recoveryId from missed and recovery dates
 * Per REQ-110: hash(missedDate, recoveryDate) using FNV-1a
 * 
 * @param missedDate - The date that was missed (Timestamp)
 * @param recoveryDate - The date recovery was completed (Timestamp)
 * @returns Deterministic recoveryId string
 */
export function generateRecoveryId(missedDate: Timestamp, recoveryDate: Timestamp): string {
  if (!missedDate || !recoveryDate) {
    throw new Error('Both missedDate and recoveryDate are required for recoveryId generation');
  }
  
  // Convert timestamps to ISO date strings for consistent hashing
  const missedDateStr = missedDate.toDate().toISOString().split('T')[0]; // YYYY-MM-DD
  const recoveryDateStr = recoveryDate.toDate().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Create consistent input string for hashing
  const hashInput = `${missedDateStr}:${recoveryDateStr}`;
  
  return fnv1aHash32(hashInput);
}

/**
 * Validate that a recoveryId matches expected format
 * RecoveryId should be 8-character lowercase hex string
 */
export function isValidRecoveryId(recoveryId: string): boolean {
  return /^[0-9a-f]{8}$/.test(recoveryId);
}

/**
 * Generate multiple recoveryIds for batch operations
 * Ensures all IDs are unique within the batch
 */
export function generateRecoveryIds(
  recoveryPairs: Array<{ missedDate: Timestamp; recoveryDate: Timestamp }>
): string[] {
  const ids = recoveryPairs.map(pair => generateRecoveryId(pair.missedDate, pair.recoveryDate));
  
  // Verify uniqueness (should be guaranteed by FNV-1a but validate anyway)
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new Error('Hash collision detected in recoveryId generation - this should not happen');
  }
  
  return ids;
}