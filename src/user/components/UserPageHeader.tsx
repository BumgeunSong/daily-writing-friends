import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@shared/ui/skeleton';
import { fetchUserNickname } from '../utils/userUtils';

interface UserPageHeaderProps {
  userId: string;
}

export default function UserPageHeader({ userId }: UserPageHeaderProps) {
  const { data: nickname, isLoading, isError } = useQuery({
    queryKey: ['user-nickname', userId],
    queryFn: () => fetchUserNickname(userId),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1분 캐싱
  });

  return (
    <header className="bg-black py-4 text-white">
      <div className="container px-4">
        {isLoading ? (
          <Skeleton className="h-8 w-28 rounded bg-neutral-800" />
        ) : isError ? (
          <h1 className="pl-2 text-2xl font-bold sm:text-3xl">사용자</h1>
        ) : (
          <h1 className="pl-2 text-2xl font-bold sm:text-3xl">{nickname || '사용자'}</h1>
        )}
      </div>
    </header>
  );
}
