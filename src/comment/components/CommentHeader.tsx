import { getRelativeTime } from '@/shared/utils/dateUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { WritingBadgeComponent } from '@/stats/components/WritingBadgeComponent';
import { usePostProfileBadges } from '@/stats/hooks/usePostProfileBadges';
import { useUser } from '@/user/hooks/useUser';
import type { Timestamp } from 'firebase/firestore';

interface CommentHeaderProps {
  userId: string;
  createdAt?: Timestamp;
}

export function CommentHeader({ userId, createdAt }: CommentHeaderProps) {
  const { userData: userProfile } = useUser(userId);
  const { data: badges } = usePostProfileBadges(userId);

  return (
    <div className='flex items-center space-x-3'>
      <Avatar className='size-6'>
        <AvatarImage
          src={userProfile?.profilePhotoURL || undefined}
          alt={getUserDisplayName(userProfile) || 'User'}
          className='object-cover'
        />
        <AvatarFallback className='text-sm'>
          {getUserDisplayName(userProfile)?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      <div className='flex items-baseline gap-1.5'>
        <span className='text-sm font-bold leading-none'>
          {getUserDisplayName(userProfile)}
        </span>
        {badges?.map((badge) => (
          <WritingBadgeComponent key={badge.name} badge={badge} />
        ))}
        <span className='text-sm leading-none text-muted-foreground/70'>
          {getRelativeTime(createdAt?.toDate())}
        </span>
      </div>
    </div>
  );
}
