import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { StreakInfo, StreakInfoSchema } from '../model/StreakInfo';

/**
 * Fetches streak information for a specific user
 */
export async function fetchStreakInfo(userId: string): Promise<StreakInfo | null> {
  try {
    const streakInfoRef = doc(firestore, 'users', userId, 'streakInfo', 'current');
    const streakInfoSnap = await getDoc(streakInfoRef);
    
    if (!streakInfoSnap.exists()) {
      return null;
    }
    
    const data = streakInfoSnap.data();
    const result = StreakInfoSchema.safeParse(data);
    
    if (!result.success) {
      console.error('Invalid streak info data:', result.error);
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching streak info:', error);
    return null;
  }
}