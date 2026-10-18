import { DonatorBadge } from '@/donator/components/DonatorBadge';
import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import { Skeleton } from '@/shared/ui/skeleton';
import { PostingStreakBadge } from '@/stats/components/PostingStreakBadge';
import { WritingBadgeComponent } from '@/stats/components/WritingBadgeComponent';
import type { WritingBadge } from '@/stats/model/WritingStats';

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
  isDonator: boolean;
  /** `null` renders the author as inert, non-interactive markup instead of a button. */
  onClickProfile: ((e: React.MouseEvent) => void) | null;
  badges?: WritingBadge[];
  streak?: boolean[];
  isStreakLoading?: boolean;
}

export const PostUserProfile: React.FC<PostUserProfileProps> = ({
  authorData,
  isLoading,
  isDonator,
  onClickProfile,
  badges,
  streak,
  isStreakLoading,
}) => {
  const AvatarTag = onClickProfile ? 'button' : 'span';
  const NameTag = onClickProfile ? 'button' : 'span';

  return (
  <div className='flex items-center'>
    {isLoading ? (
      <Skeleton className='size-7 rounded-full' />
    ) : (
      <AvatarTag
        type={onClickProfile ? 'button' : undefined}
        onClick={onClickProfile ?? undefined}
        aria-label={onClickProfile ? '작성자 프로필로 이동' : undefined}
        className={`group/profile min-h-[44px] min-w-[44px] rounded-full transition-[transform,background-color] duration-150 ${onClickProfile ? 'cursor-pointer active:scale-[0.96] active:bg-accent/20' : ''}`}
      >
        <ComposedAvatar
          src={authorData?.profilePhotoURL || authorData?.profileImageURL}
          alt={authorData?.realName || authorData?.displayName || 'User'}
          fallback={authorData?.realName?.[0] || authorData?.displayName?.[0] || 'U'}
          size={36}
        />
      </AvatarTag>
    )}
    <div className='ml-2'>
      {isLoading ? (
        <Skeleton className='h-4 w-20' />
      ) : (
        <div className='flex flex-col gap-1'>
          <NameTag
            type={onClickProfile ? 'button' : undefined}
            className={`flex items-center gap-1 text-sm font-medium text-foreground/90 transition-colors duration-150 ${onClickProfile ? 'cursor-pointer active:text-primary group-hover/profile:text-primary group-hover/profile:underline' : ''}`}
            onClick={onClickProfile ?? undefined}
            aria-label={onClickProfile ? '작성자 프로필로 이동' : undefined}
          >
            <span>{authorData?.displayName}</span>
            {isDonator && <DonatorBadge />}
          </NameTag>
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
};
