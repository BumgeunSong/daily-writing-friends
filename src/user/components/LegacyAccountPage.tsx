import { useQuery } from '@tanstack/react-query';
import { Edit, BarChart3, MessageCircle } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegisterTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUser } from '@/user/hooks/useUser';
import { getUserActivityCount } from '@/user/utils/activityUtils';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Button } from '@/shared/ui/button';

// 계정 페이지 스크롤 영역의 고유 ID
const ACCOUNT_SCROLL_ID = 'account-scroll';

export default function LegacyAccountPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { userData, isLoading } = useUser(currentUser?.uid);
  
  // 계정 페이지 스크롤 핸들러 - 데이터 새로고침 없이 스크롤만 최상단으로 이동
  const handleAccountTabClick = useCallback(() => {
    // 기본 window 스크롤은 최상단으로 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // Account 탭 핸들러 등록
  useRegisterTabHandler('Account', handleAccountTabClick);

  const handleEditProfile = () => {
    if (userData) {
      navigate('/account/edit', { state: { userData } }); // Pass userData to EditAccountPage
    }
  };

  if (isLoading) {
    return (
      <div className='flex flex-col items-center p-4 pt-8'>
        <Skeleton className='mb-4 size-32 rounded-full' />
        <Skeleton className='mb-2 h-4 w-[250px]' />
        <Skeleton className='mb-4 h-4 w-[200px]' />
        <Skeleton className='mb-2 h-4 w-[300px]' />
        <Skeleton className='mb-4 h-4 w-[250px]' />
        <Skeleton className='h-10 w-[200px]' />
      </div>
    );
  }

  if (!userData) {
    return <div className='p-4 pt-8 text-center'>No user data found.</div>;
  }

  return (
    <div className='flex min-h-screen flex-col items-center bg-gray-50 p-4 pb-24 pt-8' id={ACCOUNT_SCROLL_ID}>
      <Card className='w-full max-w-md overflow-hidden'>
        <div className='relative h-32 bg-gradient-to-r from-gray-900 to-black' />
        <div className='relative z-0 -mt-16 flex flex-col items-center'>
          <img
            src={userData.profilePhotoURL || '/placeholder.svg?height=128&width=128'}
            alt={`${userData.nickname}'s profile`}
            className='mb-4 size-32 rounded-full border-4 border-white shadow-lg'
          />
          <CardContent className='w-full text-center'>
            <h2 className='mb-4 text-2xl font-bold'>{userData.nickname}</h2>
            <div className='mb-6 space-y-2'>
              <p className='text-sm'>
                <span className='font-semibold'>Email:</span> {userData.email}
              </p>
              <p className='text-sm'>
                <span className='font-semibold'>자기소개:</span>{' '}
                {userData.bio || '아직 자기소개가 없어요.'}
              </p>
            </div>
            <ActivitySummary />
            <div className='mt-6 space-y-3 pb-16'>
              <Button
                variant="default"
                className='w-full'
                onClick={handleEditProfile}
              >
                <Edit className='mr-2 size-4' />
                내 정보 수정하기
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

function ActivitySummary() {
  // 최근 3일 동안의 활동 데이터 가져오기
  const { currentUser } = useAuth();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: activityData } = useQuery({
    queryKey: ['activityData', currentUser?.uid],
    queryFn: () => getUserActivityCount(currentUser?.uid, threeDaysAgo, new Date()),
    cacheTime: 3 * 60 * 1000, // 3분 동안 캐시 유지
    staleTime: 10 * 60 * 1000, // 10분 동안 캐시 유지
  });

  const totalActivityCount = activityData ? activityData.totalCount : 0;

  return (
    <div className='my-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5'>
      <div className='mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900'>
        <BarChart3 className='size-4' />
        최근 3일 기록
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='rounded-lg bg-blue-50 p-3 transition-all hover:bg-blue-100'>
          <div className='flex items-center gap-2 text-blue-600'>
            <MessageCircle className='size-4' />
            <span className='text-sm font-medium'>댓글/답글</span>
          </div>
          <p className='mt-2 text-2xl font-bold text-blue-700'>
            {totalActivityCount}
          </p>
        </div>
      </div>
    </div>
  );
}