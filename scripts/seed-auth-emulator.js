#!/usr/bin/env node

/**
 * Seed Firebase Auth Emulator with test users for E2E testing
 * 
 * This script creates test users in the Firebase Auth emulator using the Admin SDK.
 * It supports both email/password and custom token authentication strategies.
 * 
 * Usage:
 *   node scripts/seed-auth-emulator.js
 *   npm run emu:seed
 */

import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const EMULATOR_HOST = 'localhost';
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8080;

// Test user configuration
const TEST_USERS = [
  {
    uid: 'e2e-user-1',
    email: 'e2e@example.com',
    password: 'test1234',
    displayName: 'E2E Test User',
    emailVerified: true,
    customClaims: {
      role: 'user',
      testUser: true
    }
  },
  {
    uid: 'e2e-user-2', 
    email: 'e2e2@example.com',
    password: 'test1234',
    displayName: 'E2E Test User 2',
    emailVerified: true,
    customClaims: {
      role: 'user',
      testUser: true
    }
  },
  {
    uid: 'e2e-admin',
    email: 'admin@example.com', 
    password: 'admin1234',
    displayName: 'E2E Admin User',
    emailVerified: true,
    customClaims: {
      role: 'admin',
      testUser: true
    }
  }
];

/**
 * Initialize Firebase Admin SDK for emulator use
 */
function initializeAdmin() {
  // Set emulator environment variables
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`;
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`;

  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: 'demo-project', // Use demo project ID for emulator
    });
  }

  console.log(`🔥 Connected to Firebase emulators:`);
  console.log(`   Auth: ${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`);
  console.log(`   Firestore: ${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`);
}

/**
 * Create or update a user in the Auth emulator
 */
async function createOrUpdateUser(userConfig) {
  const { uid, email, password, displayName, emailVerified, customClaims } = userConfig;
  
  try {
    // Try to get existing user
    let user;
    try {
      user = await admin.auth().getUser(uid);
      console.log(`👤 User ${email} already exists, updating...`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`👤 Creating new user ${email}...`);
        user = null;
      } else {
        throw error;
      }
    }

    // Create or update user
    const userRecord = user 
      ? await admin.auth().updateUser(uid, {
          email,
          displayName,
          emailVerified,
          password
        })
      : await admin.auth().createUser({
          uid,
          email,
          displayName,
          emailVerified,
          password
        });

    // Set custom claims
    if (customClaims) {
      await admin.auth().setCustomUserClaims(uid, customClaims);
      console.log(`🏷️  Set custom claims for ${email}:`, customClaims);
    }

    console.log(`✅ User ${email} ready (UID: ${uid})`);
    return userRecord;

  } catch (error) {
    console.error(`❌ Failed to create/update user ${email}:`, error.message);
    throw error;
  }
}

/**
 * Create basic user profile documents in Firestore
 */
async function createUserProfiles(users) {
  const db = admin.firestore();
  
  console.log('📄 Creating user profile documents...');
  
  for (const userConfig of users) {
    try {
      const userProfile = {
        id: userConfig.uid,
        email: userConfig.email,
        displayName: userConfig.displayName,
        nickname: userConfig.displayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: userConfig.customClaims?.role || 'user',
        isTestUser: true, // Mark as test user
        // Add any other profile fields your app expects
        profilePhotoURL: null,
        bio: `Test user profile for ${userConfig.displayName}`,
      };

      await db.collection('users').doc(userConfig.uid).set(userProfile, { merge: true });
      console.log(`📄 Created profile for ${userConfig.email}`);

    } catch (error) {
      console.error(`❌ Failed to create profile for ${userConfig.email}:`, error.message);
    }
  }
}

/**
 * Generate custom tokens for fast authentication
 */
async function generateCustomTokens(users) {
  console.log('🎟️  Generating custom tokens for fast authentication...');
  
  const tokens = {};
  
  for (const userConfig of users) {
    try {
      const customToken = await admin.auth().createCustomToken(userConfig.uid, userConfig.customClaims);
      tokens[userConfig.uid] = customToken;
      console.log(`🎟️  Generated token for ${userConfig.email}`);
    } catch (error) {
      console.error(`❌ Failed to generate token for ${userConfig.email}:`, error.message);
    }
  }

  // Save tokens to a file for Playwright tests to use
  const tokensPath = join(__dirname, '..', 'tests', 'fixtures', 'auth-tokens.json');
  try {
    await import('fs').then(fs => fs.promises.writeFile(tokensPath, JSON.stringify(tokens, null, 2)));
    console.log(`💾 Saved custom tokens to ${tokensPath}`);
  } catch (error) {
    console.warn(`⚠️  Could not save tokens file: ${error.message}`);
  }

  return tokens;
}

/**
 * Wait for emulators to be ready
 */
async function waitForEmulators() {
  console.log('⏳ Waiting for emulators to be ready...');
  
  let retries = 30; // 30 seconds timeout
  while (retries > 0) {
    try {
      // Test Auth emulator by attempting to list users
      await admin.auth().listUsers(1);
      console.log('✅ Auth emulator is ready');
      
      // Test Firestore emulator by attempting to read
      await admin.firestore().collection('__test__').limit(1).get();
      console.log('✅ Firestore emulator is ready');
      
      return;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw new Error(`Emulators not ready after 30 seconds. Make sure to run 'firebase emulators:start' first.`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🌱 Starting Firebase Auth emulator seeding...\n');

    // Initialize Admin SDK with emulator configuration
    initializeAdmin();

    // Wait for emulators to be ready
    await waitForEmulators();

    // Create/update test users
    console.log('\n👥 Creating test users...');
    const users = [];
    for (const userConfig of TEST_USERS) {
      const user = await createOrUpdateUser(userConfig);
      users.push(user);
    }

    // Create user profiles in Firestore
    await createUserProfiles(TEST_USERS);

    // Generate custom tokens
    await generateCustomTokens(TEST_USERS);

    console.log('\n🎉 Auth emulator seeding completed successfully!');
    console.log('\n📋 Test users created:');
    TEST_USERS.forEach(user => {
      console.log(`   • ${user.email} (${user.password}) - ${user.displayName}`);
    });

    console.log('\n🚀 You can now run E2E tests with these users.');

  } catch (error) {
    console.error('\n💥 Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TEST_USERS, createOrUpdateUser, generateCustomTokens };