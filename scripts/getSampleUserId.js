#!/usr/bin/env node

/**
 * Get a sample user ID with postings for testing backfill
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function getSampleUser() {
  console.log('Searching for a user with postings...\n');

  // Get first 5 users
  const usersSnapshot = await db.collection('users').limit(5).get();

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;

    // Check if user has postings
    const postingsSnapshot = await db
      .collection(`users/${userId}/postings`)
      .limit(1)
      .get();

    if (!postingsSnapshot.empty) {
      // Check if user already has events
      const eventsSnapshot = await db
        .collection(`users/${userId}/events`)
        .limit(1)
        .get();

      const hasEvents = !eventsSnapshot.empty;

      console.log('✅ Found user with postings:');
      console.log(`   User ID: ${userId}`);
      console.log(`   Has existing events: ${hasEvents ? 'Yes' : 'No'}`);

      // Get posting count
      const allPostings = await db
        .collection(`users/${userId}/postings`)
        .get();
      console.log(`   Posting count: ${allPostings.size}`);

      console.log('\nTo test backfill, run:');
      console.log(`   ./scripts/testBackfillSingleUser.sh ${userId}`);

      process.exit(0);
    }
  }

  console.log('❌ No users with postings found in first 5 users.');
  process.exit(1);
}

getSampleUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
