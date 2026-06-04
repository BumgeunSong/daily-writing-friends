import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import type { FirebaseTimestamp } from '@/shared/model/Timestamp';
import { getRelativeTime } from '@/shared/utils/dateUtils';
import { usePostProfileBadges } from '@/stats/hooks/usePostProfileBadges';
import { WritingBadgeComponent } from '@/stats/components/WritingBadgeComponent';
import type { CommentAuthor } from '@/comment/model/Comment';

interface CommentHeaderProps {
  userId: string;
  createdAt?: FirebaseTimestamp;
  /** Live author profile from the comments/replies JOIN. */
  author?: CommentAuthor;
  /** Snapshot fields used as fallback when author is unavailable. */
  fallbackName: string;
  fallbackProfileImage: string;
}

function resolveDisplayName(author: CommentAuthor | undefined, fallback: string): string {
  const liveNickname = author?.nickname?.trim();
  if (liveNickname) return liveNickname;
  const snapshot = fallback.trim();
  return snapshot || '??';
}

function resolveProfileImage(author: CommentAuthor | undefined, fallback: string): string | undefined {
  return author?.profilePhotoURL || fallback || undefined;
}

export function CommentHeader({
  userId,
  createdAt,
  author,
  fallbackName,
  fallbackProfileImage,
}: CommentHeaderProps) {
  const { data: badges } = usePostProfileBadges(userId);
  const displayName = resolveDisplayName(author, fallbackName);
  const profileImage = resolveProfileImage(author, fallbackProfileImage);

  return (
    <div className='flex items-center space-x-3'>
      <ComposedAvatar
        size={24}
        src={profileImage}
        alt={displayName}
        fallback={displayName[0] || '?'}
      />
      <div className='flex items-baseline gap-1.5'>
        <span className='text-sm font-bold leading-none'>{displayName}</span>
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
