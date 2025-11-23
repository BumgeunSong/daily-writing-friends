import { onRequest } from 'firebase-functions/v2/https';
import { backfillAllUsers } from './backfillAllUsersDb';
import { backfillUserEvents } from './backfillUserEventsDb';

export const backfillHistoricalEventsHttp = onRequest({
  timeoutSeconds: 540,
  memory: '2GiB',
  maxInstances: 1,
  cors: true,
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const userId = req.query.userId as string | undefined;
    const all = req.query.all === 'true';

    if (userId) {
      const stats = await backfillUserEvents(userId);
      res.status(200).json({ success: true, mode: 'single', stats });
    } else if (all) {
      const stats = await backfillAllUsers();
      res.status(200).json({ success: true, mode: 'all', stats });
    } else {
      res.status(400).json({ error: 'Missing param: userId or all=true' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
