import { Camera, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '../../../types/User';
import { useNickname } from '../../../hooks/useNickName';
import { useProfilePhoto } from '../../../hooks/useProfilePhoto';
import { useUpdateUserData } from '../../../hooks/useUpdateUserData';
import { useRef } from 'react';

export default function EditAccountPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { userData } = location.state as { userData: User };
  const { nickname, handleNicknameChange } = useNickname(userData.nickname || '');
  const { profilePhotoFile, currentProfilePhotoURL, handleProfilePhotoChange } = useProfilePhoto(userData.profilePhotoURL);
  const profilePhotoFileRef = useRef<HTMLInputElement>(null);
  const { onSubmit, isLoading } = useUpdateUserData(userData.uid, nickname, profilePhotoFile);

  const showProfilePhotoChangeButton = () => {
    !isLoading && profilePhotoFileRef.current?.click();
  }

  return (
    <div className='flex min-h-screen items-start justify-center bg-gray-50 p-4 relative'>
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50'>
          <Loader2 className='size-8 animate-spin text-gray-600' />
        </div>
      )}
      <Card className={`w-full max-w-md ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader>
          <CardTitle className='text-center text-2xl font-bold'>내 정보 수정하기</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className='space-y-6'>
            <div className='flex flex-col items-center space-y-4'>
              <Avatar
                className='size-32 cursor-pointer'
                onClick={showProfilePhotoChangeButton}
              >
                <AvatarImage src={currentProfilePhotoURL} alt={nickname} />
                <AvatarFallback className='flex items-center justify-center bg-gray-200 text-4xl text-gray-600'>
                  {nickname ? nickname[0].toUpperCase() : <Camera className='size-8' />}
                </AvatarFallback>
              </Avatar>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='mt-2'
                onClick={showProfilePhotoChangeButton}
                disabled={isLoading}
              >
                프로필 사진 변경
              </Button>
              <Input
                type='file'
                accept='image/*'
                onChange={handleProfilePhotoChange}
                className='hidden'
                ref={profilePhotoFileRef}
                disabled={isLoading}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='nickname'>닉네임</Label>
              <Input
                id='nickname'
                type='text'
                value={nickname}
                onChange={handleNicknameChange}
                placeholder='새로운 닉네임을 입력하세요'
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className='flex justify-between gap-4'>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={() => navigate('/account')}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading ? <Loader2 className='size-4 animate-spin' /> : '저장하기'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
