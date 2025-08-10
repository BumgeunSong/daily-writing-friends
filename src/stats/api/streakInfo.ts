import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { StreakInfo, StreakInfoSchema } from '../model/StreakInfo';
import { RecoveryHistory } from '@/stats/model/RecoveryHistory';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { getDateRange } from '@/stats/api/stats';

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

/**
 * 최근 근무일 기준 범위로 사용자의 복구 이력(recoveryHistory)을 조회합니다.
 * 기준 필드는 missedDate (YYYY-MM-DD 문자열) 입니다.
 */
export async function fetchRecoveryHistoryByMissedDateRange(
  userId: string,
  numberOfDays: number = 20,
): Promise<RecoveryHistory[]> {
  try {
    const workingDays = getRecentWorkingDays(numberOfDays);
    const { start, end } = getDateRange(workingDays);

    const colRef = collection(
      firestore,
      'users',
      userId,
      'streakInfo',
      'current',
      'recoveryHistory',
    );
    const q = query(
      colRef,
      // Firestore 문자열 범위: YYYY-MM-DD 형식이라면 안전하게 범위 쿼리 가능
      where('missedDate', '>=', formatDateYYYYMMDD(start)),
      where('missedDate', '<=', formatDateYYYYMMDD(end)),
      orderBy('missedDate', 'asc'),
    );

    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => doc.data() as RecoveryHistory)
      .filter((d) => !!d && !!d.missedDate && d.successful === true);
  } catch (error) {
    console.error('Error fetching recovery history:', error);
    return [];
  }
}

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
