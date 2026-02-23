import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import { Skeleton } from '@/shared/ui/skeleton';
import { PostingStreakBadge } from '@/stats/components/PostingStreakBadge';
import { WritingBadgeComponent } from '@/stats/components/WritingBadgeComponent';
import { WritingBadge } from '@/stats/model/WritingStats';

export interface PostAuthorData {
  id: string;
  displayName?: string;
  nickname?: string;
  realName?: string;
  profileImageURL?: string;
  profilePhotoURL?: string;
}

interface PostUserProfileProps {
  authorData: PostAuthorData | null;
  isLoading: boolean;
  onClickProfile: (e: React.MouseEvent) => void;
  badges?: WritingBadge[];
  streak?: boolean[];
  isStreakLoading?: boolean;
}

export const PostUserProfile: React.FC<PostUserProfileProps> = ({
  authorData,
  isLoading,
  onClickProfile,
  badges,
  streak,
  isStreakLoading,
}) => (
  <div className='flex items-center'>
    {isLoading ? (
      <Skeleton className='size-7 rounded-full' />
    ) : (
      <button
        type='button'
        onClick={onClickProfile}
        aria-label='작성자 프로필로 이동'
        className='group/profile min-h-[44px] min-w-[44px] cursor-pointer rounded-full transition-all duration-150 active:scale-95 active:bg-accent/20'
      >
        <ComposedAvatar
          src={authorData?.profilePhotoURL || authorData?.profileImageURL}
          alt={authorData?.realName || authorData?.displayName || 'User'}
          fallback={authorData?.realName?.[0] || authorData?.displayName?.[0] || 'U'}
          size={36}
        />
      </button>
    )}
    <div className='ml-2'>
      {isLoading ? (
        <Skeleton className='h-4 w-20' />
      ) : (
        <div className='flex flex-col gap-1'>
          <button
            type='button'
            className='flex cursor-pointer items-center text-sm font-medium text-foreground/90 transition-colors duration-150 active:text-primary group-hover/profile:text-primary group-hover/profile:underline'
            onClick={onClickProfile}
            aria-label='작성자 프로필로 이동'
          >
            {authorData?.displayName}
          </button>
          {(streak || isStreakLoading || (badges && badges.length > 0)) && (
            <div className='flex flex-wrap items-center gap-1'>
              <PostingStreakBadge streak={streak} isLoading={isStreakLoading} />
              {badges?.map((badge) => (
                <WritingBadgeComponent key={badge.name} badge={badge} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
