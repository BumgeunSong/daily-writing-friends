import { Skeleton } from "@/shared/ui/skeleton";
import KnownBuddyProfileAccessory from './KnownBuddyProfileAccessory';
import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import { WritingBadgeComponent } from '@/stats/components/WritingBadgeComponent';
import { WritingBadge } from '@/stats/model/WritingStats';

interface PostUserProfileProps {
    authorData: any;
    isLoading: boolean;
    isKnownBuddy: boolean;
    onClickProfile: (e: React.MouseEvent) => void;
    badges?: WritingBadge[];
  }

export const PostUserProfile: React.FC<PostUserProfileProps> = ({ authorData, isLoading, isKnownBuddy, onClickProfile, badges }) => (
    <div className="flex items-center">
      {isLoading ? (
        <Skeleton className="size-7 rounded-full" />
      ) : isKnownBuddy ? (
        <KnownBuddyProfileAccessory>
          <ComposedAvatar
            src={authorData?.profilePhotoURL}
            alt={authorData?.realName || 'User'}
            fallback={authorData?.realName?.[0] || 'U'}
            size={36}
            className="cursor-pointer transition-all duration-150 group/profile min-w-[44px] min-h-[44px] active:scale-95 active:bg-accent/20"
            onClick={onClickProfile}
            role="button"
            tabIndex={0}
            aria-label="작성자 프로필로 이동"
            onKeyDown={e => handleKeyDown(e, onClickProfile)}
          />
        </KnownBuddyProfileAccessory>
      ) : (
        <ComposedAvatar
          src={authorData?.profilePhotoURL}
          alt={authorData?.realName || 'User'}
          fallback={authorData?.realName?.[0] || 'U'}
          size={36}
          className="cursor-pointer transition-all duration-150 group/profile min-w-[44px] min-h-[44px] active:scale-95 active:bg-accent/20"
          onClick={onClickProfile}
          role="button"
          tabIndex={0}
          aria-label="작성자 프로필로 이동"
          onKeyDown={e => handleKeyDown(e, onClickProfile)}
        />
      )}
      <div className="ml-2">
        {isLoading ? (
          <Skeleton className="h-4 w-20" />
        ) : (
          <div className="flex flex-col gap-1">
            <p
              className="text-sm font-medium text-foreground/90 cursor-pointer transition-colors duration-150 group-hover/profile:text-primary group-hover/profile:underline flex items-center active:text-primary"
              onClick={onClickProfile}
              role="button"
              tabIndex={0}
              aria-label="작성자 프로필로 이동"
              onKeyDown={e => handleKeyDown(e, onClickProfile)}
            >
              {authorData?.nickname || "알 수 없음"}
            </p>
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {badges.map((badge) => (
                  <WritingBadgeComponent key={badge.name} badge={badge} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

// 키보드 접근성: role="button"에서 Enter/Space로 클릭 지원
function handleKeyDown(e: React.KeyboardEvent, onClick: (e: any) => void) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  }
  