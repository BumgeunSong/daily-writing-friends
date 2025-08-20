import { Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useUser } from '@/user/hooks/useUser';

interface UserProfileProps {
  uid: string;
}

export default function UserProfile({ uid }: UserProfileProps) {
  const { userData, isLoading } = useUser(uid);

  if (isLoading) {
    return (
      <div className='flex items-center gap-4'>
        <Skeleton className='size-16 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-3 w-40' />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className='flex items-center justify-center py-4'>
        <p className='text-sm text-muted-foreground'>User not found</p>
      </div>
    );
  }

  return (
    <div className='reading-shadow flex w-full items-start gap-4 rounded-lg border border-border/50 bg-card p-4'>
      <Avatar className='size-16 shrink-0 md:size-20'>
        {userData.profilePhotoURL ? (
          <AvatarImage
            src={userData.profilePhotoURL || '/placeholder.svg'}
            alt={`${getUserDisplayName(userData)}'s profile`}
          />
        ) : (
          <AvatarFallback>{getUserDisplayName(userData)?.charAt(0).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold tracking-tight text-foreground md:text-xl'>
            {getUserDisplayName(userData)}
          </h2>
          <UserProfileSettingsButton uid={uid} />
        </div>
        <p className='text-reading mt-2 line-clamp-2 text-sm text-muted-foreground'>
          {userData.bio || '아직 자기소개가 없어요 😅'}
        </p>
      </div>
    </div>
  );
}

// 설정 버튼 분리 컴포넌트
function UserProfileSettingsButton({ uid }: { uid: string }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  if (currentUser?.uid !== uid) return null;
  return (
    <Button
      variant='ghost'
      size='icon'
      aria-label='설정'
      className='reading-hover reading-focus ml-2 shrink-0 transition-all duration-200 active:scale-[0.99]'
      onClick={() => navigate(`/account/edit/${uid}`)}
    >
      <Edit className='size-4 text-muted-foreground md:size-5' />
    </Button>
  );
}
