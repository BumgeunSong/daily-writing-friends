import { Camera, Loader2 } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query'

import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { useNickname } from '@/user/hooks/useNickName';
import { useProfilePhoto } from '@/user/hooks/useProfilePhoto';
import { useUpdateUserData } from '@/user/hooks/useUpdateUserData';
import { useUser } from '@/user/hooks/useUser';
import StatusMessage from '@/shared/components/StatusMessage';

export default function EditAccountPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!userId) {
    return <StatusMessage errorMessage="유저 정보를 찾을 수 없습니다." />
  }

  // 2. userId로 userData 패칭
  const { userData, isLoading: isLoadingUser } = useUser(userId);

  // 3. 훅은 항상 호출 (userData가 undefined일 때도 안전하게 초기값 처리)
  const { nickname, handleNicknameChange } = useNickname(userData?.nickname || '');
  const { profilePhotoFile, currentProfilePhotoURL, handleProfilePhotoChange } = useProfilePhoto(userData?.profilePhotoURL || null);
  const [bio, setBio] = useState(userData?.bio || '');
  const profilePhotoFileRef = useRef<HTMLInputElement>(null);
  const { mutateAsync, isLoading: isLoadingUpdate } = useUpdateUserData();

  // bio 상태는 userData가 바뀔 때 동기화
  useEffect(() => {
    setBio(userData?.bio || '');
  }, [userData?.bio]);

  const showProfilePhotoChangeButton = () => {
    !isLoadingUser && profilePhotoFileRef.current?.click();
  }
  
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 150) {
      setBio(e.target.value);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({
        userId: userData?.uid || '',
        nickname,
        profilePhotoFile,
        bio,
      });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      navigate(-1)
    } catch (err) {
      // 에러는 useUpdateUserData에서 처리됨
    }
  };

  const isLoading = isLoadingUser || isLoadingUpdate;

  return (
    <div className='relative flex min-h-screen items-start justify-center bg-gray-50 p-4'>
      {isLoading && (
        <div className='absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75'>
          <Loader2 className='size-8 animate-spin text-gray-600' />
        </div>
      )}
      <Card className={`w-full max-w-md ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
        <CardHeader>
          <CardTitle className='text-center text-2xl font-bold'>내 정보 수정하기</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
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
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <Label htmlFor='bio'>소개글</Label>
                <span className='text-xs text-muted-foreground'>{bio.length}/150</span>
              </div>
              <Textarea
                id='bio'
                value={bio}
                onChange={handleBioChange}
                placeholder='자신을 간단히 소개해 주세요'
                className='min-h-24 resize-none'
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className='flex justify-between gap-4'>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={() => navigate(-1)}
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
