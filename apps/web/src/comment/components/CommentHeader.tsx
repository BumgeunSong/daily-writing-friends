import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import { userProfilePath } from '@/shared/constants/routes';
import { useNavigate } from '@/shared/navigation';
import type { FirebaseTimestamp } from '@/shared/model/Timestamp';
import { getRelativeTime } from '@/shared/utils/dateUtils';
import { usePostProfileBadges } from '@/stats/hooks/usePostProfileBadges';
import { WritingBadgeComponent } from '@/stats/components/WritingBadgeComponent';
import type { WritingBadge } from '@/stats/model/WritingStats';
import type { CommentAuthor } from '@/comment/model/Comment';

interface CommentHeaderProps {
  userId: string;
  createdAt?: FirebaseTimestamp;
  /** Live author profile from the comments/replies JOIN. */
  author?: CommentAuthor;
  /** Snapshot fields used as fallback when author is unavailable. */
  fallbackName: string;
  fallbackProfileImage: string;
  /**
   * Pre-resolved badges (e.g. static preview data). When provided, the internal
   * usePostProfileBadges fetch is skipped entirely.
   */
  badges?: WritingBadge[];
  /**
   * Overrides the default relative-time label. Static snapshots (e.g. the
   * preview) pass an absolute date here so the timestamp does not drift to
   * "N일 전" against the viewer's clock.
   */
  timeLabel?: string;
  /**
   * Omit to navigate to `/user/:userId` by default, pass a handler to override it,
   * or pass `null` to render the author as inert, non-interactive markup (e.g. the
   * preview's synthetic `pv-author-*` authors, which must never look navigable).
   */
  onClickProfile?: (() => void) | null;
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

function ProfileLinkButton({
  onClick,
  className,
  children,
}: {
  onClick: (() => void) | null;
  className: string;
  children: React.ReactNode;
}) {
  if (!onClick) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      type='button'
      onClick={onClick}
      aria-label='작성자 프로필로 이동'
      className={`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${className}`}
    >
      {children}
    </button>
  );
}

export function CommentHeader({
  userId,
  createdAt,
  author,
  fallbackName,
  fallbackProfileImage,
  badges: providedBadges,
  timeLabel,
  onClickProfile,
}: CommentHeaderProps) {
  // Always call the hook to satisfy the rules of hooks, but disable the fetch
  // when badges are supplied directly (preview / static data).
  const { data: fetchedBadges } = usePostProfileBadges(userId, {
    enabled: providedBadges === undefined,
  });
  const badges = providedBadges ?? fetchedBadges;
  const displayName = resolveDisplayName(author, fallbackName);
  const profileImage = resolveProfileImage(author, fallbackProfileImage);
  const navigate = useNavigate();
  const goToProfile =
    onClickProfile === null ? null : onClickProfile ?? (() => navigate(userProfilePath(userId)));

  return (
    <div className='flex items-center space-x-3'>
      <ProfileLinkButton onClick={goToProfile} className='-m-2.5 cursor-pointer rounded-full p-2.5'>
        <ComposedAvatar
          size={24}
          src={profileImage}
          alt={displayName}
          fallback={displayName[0] || '?'}
        />
      </ProfileLinkButton>
      <div className='flex items-baseline gap-1.5'>
        <ProfileLinkButton onClick={goToProfile} className='-m-2 cursor-pointer rounded p-2 text-sm font-bold leading-none hover:underline'>
          {displayName}
        </ProfileLinkButton>
        {badges?.map((badge) => (
          <WritingBadgeComponent key={badge.name} badge={badge} />
        ))}
        <span className='text-sm leading-none text-muted-foreground/70'>
          {timeLabel ?? getRelativeTime(createdAt?.toDate())}
        </span>
      </div>
    </div>
  );
}
