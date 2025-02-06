import { signOut } from 'firebase/auth';
import { BarChart3, Edit, LogOut, MessageCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../../../contexts/AuthContext';
import { auth } from '../../../firebase';
import { useUserData } from '@/hooks/useUserData';
import { useClearCache } from '@/hooks/useClearCache';
import { useQuery } from '@tanstack/react-query';
import { getUserActivityCount } from '@/utils/activityUtils';

export default function AccountPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { userData, isLoading } = useUserData(currentUser?.uid);
  const { toast } = useToast();
  const clearCache = useClearCache();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login'); // 로그아웃 후 로그인 페이지로 이동
    } catch (error) {
      console.error('로그아웃 오류:', error);
      toast({
        variant: 'destructive',
        description: '로그아웃에 실패했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleEditProfile = () => {
    if (userData) {
      navigate('/account/edit', { state: { userData } }); // Pass userData to EditAccountPage
    }
  };

  const handleFeedback = () => {
    window.open(
      'https://docs.google.com/forms/d/e/1FAIpQLSfujE9OSO58OZ6qFe9qw1vimWEcuPCX6jyDNCRZKOdCVWB5UQ/viewform?usp=sf_link',
      '_blank',
    );
  };

  const handleClearCache = async () => {
    const result = await clearCache({
      clearReactQuery: true,
      clearBrowserCache: true,
      clearLocalStorage: true,
    });

    if (result.success) {
      toast({
        description: '캐시가 성공적으로 삭제되었습니다.',
      });
    } else {
      toast({
        variant: 'destructive',
        description: '캐시 삭제에 실패했습니다. 다시 시도해주세요.',
      });
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
    <div className='flex min-h-screen flex-col items-center bg-gray-50 p-4 pb-24 pt-8'>
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

              <Button
                variant="secondary"
                className='w-full'
                onClick={handleFeedback}
              >
                <MessageCircle className='mr-2 size-4' />
                의견 보내기
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant='outline' className='w-full'>
                    <LogOut className='mr-2 size-4' />
                    로그아웃
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>로그아웃 하시겠습니까?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSignOut}>확인</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='outline'
                    className='w-full text-red-500 hover:bg-red-50 hover:text-red-600'
                  >
                    <Trash2 className='mr-2 size-4' />
                    캐시 삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>캐시를 삭제하시겠습니까?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearCache}
                      className='bg-red-500 hover:bg-red-600'
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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