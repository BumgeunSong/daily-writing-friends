import admin from '../../shared/admin';
import { onRequest } from 'firebase-functions/v2/https';

const db = admin.firestore();

/**
 * One-time migration to set default timezone for all users.
 * Sets profile.timezone = 'Asia/Seoul' for all users who don't have it set.
 *
 * Usage: Deploy and call via HTTP POST request
 * Example: curl -X POST <function-url>
 */
export const migrateDefaultTimezones = onRequest(async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();

      if (!userData.profile?.timezone) {
        batch.set(
          userDoc.ref,
          {
            profile: {
              timezone: 'Asia/Seoul',
            },
          },
          { merge: true },
        );

        count++;

        if (count % batchSize === 0) {
          await batch.commit();
          batch = db.batch();
          console.log(`Migrated ${count} users...`);
        }
      }
    }

    if (count % batchSize !== 0) {
      await batch.commit();
    }

    console.log(`Migration complete. Updated ${count} users.`);
    res.status(200).send({ success: true, updated: count });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).send({ success: false, error: String(error) });
  }
});
