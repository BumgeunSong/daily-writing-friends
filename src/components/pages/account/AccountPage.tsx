import { signOut } from 'firebase/auth';
import { Edit, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

export default function AccountPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { userData, loading } = useUserData(currentUser?.uid);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login'); // 로그아웃 후 로그인 페이지로 이동
    } catch (error) {
      console.error('로그아웃 오류:', error);
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

  if (loading) {
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
    <div className='flex min-h-screen flex-col items-center bg-gray-50 p-4 pt-8'>
      <Card className='w-full max-w-md overflow-hidden'>
        <div className='relative h-32 bg-gradient-to-r from-gray-900 to-black' />
        <div className='relative z-10 -mt-16 flex flex-col items-center'>
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
            <div className='space-y-4'>
              <Button
                className='w-full transition-all duration-300 ease-in-out hover:scale-105'
                onClick={handleEditProfile}
              >
                <Edit className='mr-2 size-4' />내 정보 수정하기
              </Button>
              <Button
                className='w-full transition-all duration-300 ease-in-out hover:scale-105'
                onClick={handleFeedback}
              >
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
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
