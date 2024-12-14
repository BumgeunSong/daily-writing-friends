import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { User } from '@/types/User';
import { fetchUserData } from '@/utils/userUtils';

export const useUserData = (userId: string | null) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      if (userId) {
        try {
          const data = await fetchUserData(userId);
          setUserData(data);
        } catch (error) {
          console.error('유저 데이터를 불러오던 중 에러가 발생했습니다:', error);
          Sentry.captureException(error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    getUserData();
  }, [userId]);

  return { userData, loading };
};