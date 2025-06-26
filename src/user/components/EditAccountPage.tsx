import { Camera, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusMessage from '@/shared/components/StatusMessage';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { useEditAccount } from '../hooks/useEditAccount';
import { useUpdateUserData } from '../hooks/useUpdateUserData';

export default function EditAccountPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const profilePhotoFileRef = useRef<HTMLInputElement>(null);
  const { mutateAsync, isLoading: isLoadingUpdate } = useUpdateUserData();
  
  const {
    userData,
    nickname,
    handleNicknameChange,
    profilePhotoFile,
    currentProfilePhotoURL,
    handleProfilePhotoChange,
    bio,
    setBio,
    isLoadingUser
  } = useEditAccount({ userId: userId ?? null });

  if (!userId) return <StatusMessage errorMessage="유저 정보를 찾을 수 없습니다." />;
  if (isLoadingUser) return <LoadingSkeleton />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({
        userId: userData?.uid || '',
        nickname,
        profilePhotoFile,
        bio,
      });
      navigate(-1)
    } catch (err) {
      // 에러는 useUpdateUserData에서 처리됨
    }
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 150) {
      setBio(e.target.value);
    }
  };

  const showProfilePhotoChangeButton = () => {
    if (!isLoadingUser && profilePhotoFileRef.current) {
      profilePhotoFileRef.current.click();
    }
  };

  return (
    <div className='min-h-screen bg-background'>
      <header className="bg-background py-3">
        <div className="container mx-auto px-3 md:px-4">
          <h1 className='text-xl font-semibold tracking-tight text-foreground md:text-2xl'>내 정보 수정하기</h1>
        </div>
      </header>
      <main className="container mx-auto px-3 py-2 md:px-4">
        <div className='relative flex items-start justify-center'>
          {isLoadingUpdate && <LoadingOverlay />}
          <Card className={`reading-shadow w-full max-w-md border-border/50 ${isLoadingUpdate ? 'pointer-events-none opacity-50' : ''}`}>
            <CardHeader>
              <CardTitle className='text-center text-lg font-semibold text-foreground'>프로필 정보</CardTitle>
            </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-6'>
            <ProfilePhotoUploader
              currentProfilePhotoURL={currentProfilePhotoURL}
              nickname={nickname}
              showProfilePhotoChangeButton={showProfilePhotoChangeButton}
              handleProfilePhotoChange={handleProfilePhotoChange}
              profilePhotoFileRef={profilePhotoFileRef}
              isLoading={isLoadingUpdate}
            />
            <div className='space-y-2'>
              <Label htmlFor='nickname'>닉네임</Label>
              <Input
                id='nickname'
                type='text'
                value={nickname}
                onChange={handleNicknameChange}
                placeholder='새로운 닉네임을 입력하세요'
                disabled={isLoadingUpdate}
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
                disabled={isLoadingUpdate}
              />
            </div>
          </CardContent>
            <CardFooter className='flex justify-between gap-4'>
              <Button
                type='button'
                variant='outline'
                className='reading-hover reading-focus min-h-[44px] w-full transition-all duration-200 active:scale-[0.99]'
                onClick={() => window.history.back()}
                disabled={isLoadingUpdate}
              >
                취소
              </Button>
              <Button 
                type='submit'
                variant='default'
                className='reading-hover reading-focus min-h-[44px] w-full transition-all duration-200 active:scale-[0.99]' 
                disabled={isLoadingUpdate}
              >
                {isLoadingUpdate ? <Loader2 className='size-4 animate-spin' /> : '저장하기'}
              </Button>
            </CardFooter>
          </form>
          </Card>
        </div>
      </main>
    </div>
  );
}

function ProfilePhotoUploader({
  currentProfilePhotoURL,
  nickname,
  showProfilePhotoChangeButton,
  handleProfilePhotoChange,
  profilePhotoFileRef,
  isLoading,
}: {
  currentProfilePhotoURL: string;
  nickname: string;
  showProfilePhotoChangeButton: () => void;
  handleProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profilePhotoFileRef: React.RefObject<HTMLInputElement>;
  isLoading: boolean;
}) {
  return (
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
  );
}

function LoadingOverlay() {
  return (
    <div className='absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75'>
      <Loader2 className='size-8 animate-spin text-gray-600' />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className='flex flex-col items-center p-4 pt-8'>
      <div className='mb-4 size-32 rounded-full bg-gray-200' />
      <div className='mb-2 h-4 w-[250px] rounded bg-gray-200' />
      <div className='mb-4 h-4 w-[200px] rounded bg-gray-200' />
      <div className='mb-2 h-4 w-[300px] rounded bg-gray-200' />
      <div className='mb-4 h-4 w-[250px] rounded bg-gray-200' />
      <div className='h-10 w-[200px] rounded bg-gray-200' />
    </div>
  );
}
