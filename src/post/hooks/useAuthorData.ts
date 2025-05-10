import { useQuery } from '@tanstack/react-query';
import { User as Author } from '@/user/model/User';
import { fetchUserData } from '@/user/utils/userUtils';

export const useAuthorData = (authorId: string | undefined | null) => {
  const { data: authorData, error, isLoading } = useQuery<Author | null>(
    ['authorData', authorId], // 쿼리 키에 authorId 포함
    () => fetchUserData(authorId!), // authorId가 유효할 때만 실행
    {
      staleTime: 10 * 60 * 1000, // 캐시 시간 10분으로 연장 (필요에 따라 조절)
      enabled: !!authorId, // authorId가 있을 때만 쿼리 활성화
    }
  );

  if (error) {
    console.error('Error fetching author data:', error);
  }

  return { authorData, isLoading, error };
}; 