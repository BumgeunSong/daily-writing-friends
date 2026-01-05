import { collection, query, orderBy, limit, startAfter, getDocs, Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Notification } from '@/notification/model/Notification';

/**
 * 알림 데이터를 가져오는 API 함수 (Firebase 접근)
 *
 * @param userId - 사용자 ID
 * @param limitCount - 한 번에 가져올 알림 수
 * @param after - 페이지네이션을 위한 타임스탬프 커서
 * @returns 알림 목록
 */
export const fetchNotifications = async (
  userId: string,
  limitCount: number,
  after?: Timestamp
): Promise<Notification[]> => {
  // CALCULATION - Build query
  let notificationsQuery = query(
    collection(firestore, `users/${userId}/notifications`),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  if (after) {
    notificationsQuery = query(notificationsQuery, startAfter(after));
  }

  // ACTION - Fetch data from Firebase
  const notificationsSnapshot = await getDocs(notificationsQuery);

  // CALCULATION - Transform data
  return notificationsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  } as Notification));
};
