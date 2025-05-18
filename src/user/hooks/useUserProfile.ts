import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '@/user/api/user';

export interface UserProfile {
  nickname: string | null;
  profilePhotoURL: string | null;
}

export function useUserProfile(uid: string | null) {
  return useQuery<UserProfile | null>(
    ['userProfile', uid],
    async () => {
      if (!uid) return null;
      const user = await fetchUser(uid);
      if (!user) return null;
      return {
        nickname: user.nickname ?? null,
        profilePhotoURL: user.profilePhotoURL ?? null,
      };
    },
    {
      enabled: !!uid,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );
}
