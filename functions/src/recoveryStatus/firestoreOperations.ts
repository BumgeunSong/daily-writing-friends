import admin from "../admin";
import { DocumentSnapshot } from "firebase-admin/firestore";
import { UserRecoveryData, extractUserRecoveryData, filterUsersForProcessing } from "./midnightUpdateHelpers";

/**
 * Fetch all users from Firestore
 * @returns Array of user document snapshots
 */
export async function fetchAllUsers(): Promise<DocumentSnapshot[]> {
  console.log(`[FirestoreOps] Fetching all users from Firestore...`);
  
  const usersRef = admin.firestore().collection('users');
  const allUsersSnapshot = await usersRef.get();
  const userDocs = allUsersSnapshot.docs;
  
  console.log(`[FirestoreOps] Fetched ${userDocs.length} user documents`);
  
  return userDocs;
}

/**
 * Convert Firestore documents to user recovery data
 * @param userDocs - Array of user document snapshots
 * @returns Array of user recovery data
 */
export function convertDocsToUserData(userDocs: DocumentSnapshot[]): UserRecoveryData[] {
  console.log(`[FirestoreOps] Converting ${userDocs.length} documents to user data...`);
  
  const users = userDocs.map(extractUserRecoveryData);
  const validUsers = filterUsersForProcessing(users);
  
  console.log(`[FirestoreOps] Converted to ${validUsers.length} valid user records`);
  
  if (validUsers.length !== users.length) {
    const invalidCount = users.length - validUsers.length;
    console.warn(`[FirestoreOps] ⚠️ Filtered out ${invalidCount} invalid user records`);
  }
  
  return validUsers;
}

/**
 * Fetch and prepare all users for recovery status processing
 * This combines fetching and data conversion in one operation
 * @returns Array of user recovery data ready for processing
 */
export async function fetchAndPrepareUsers(): Promise<UserRecoveryData[]> {
  try {
    const userDocs = await fetchAllUsers();
    
    if (userDocs.length === 0) {
      console.log(`[FirestoreOps] ✅ No users found in database`);
      return [];
    }
    
    const userData = convertDocsToUserData(userDocs);
    
    console.log(`[FirestoreOps] ✅ Successfully prepared ${userData.length} users for processing`);
    
    return userData;
    
  } catch (error) {
    console.error(`[FirestoreOps] ❌ Error fetching users:`, error);
    throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Health check for Firestore connection
 * @returns true if connection is healthy
 */
export async function checkFirestoreHealth(): Promise<boolean> {
  try {
    console.log(`[FirestoreOps] Checking Firestore connection...`);
    
    // Simple query to test connection
    const testRef = admin.firestore().collection('users').limit(1);
    await testRef.get();
    
    console.log(`[FirestoreOps] ✅ Firestore connection healthy`);
    return true;
    
  } catch (error) {
    console.error(`[FirestoreOps] ❌ Firestore connection failed:`, error);
    return false;
  }
}