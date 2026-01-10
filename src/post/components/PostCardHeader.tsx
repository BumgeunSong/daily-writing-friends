import { Lock } from 'lucide-react';
import { CardHeader } from '@/shared/ui/card';
import { WritingBadge } from '@/stats/model/WritingStats';
import { PostAuthorData, PostUserProfile } from './PostUserProfile';

// eslint-disable-next-line @typescript-eslint/no-empty-function -- Fallback for optional click handler
const noopClickHandler = () => {};

interface PostCardHeaderProps {
  title: string;
  isPrivate: boolean;
  authorData: PostAuthorData;
  isAuthorLoading: boolean;
  badges?: WritingBadge[];
  streak?: boolean[];
  isStreakLoading?: boolean;
  statPageEnabled: boolean;
  onClickProfile?: (e: React.MouseEvent) => void;
  isMobile?: boolean;
}

export const PostCardHeader: React.FC<PostCardHeaderProps> = ({
  title,
  isPrivate,
  authorData,
  isAuthorLoading,
  badges,
  streak,
  isStreakLoading,
  statPageEnabled,
  onClickProfile,
  isMobile = false,
}) => {
  return (
    <CardHeader className={`pb-1 pt-3 ${isMobile ? 'px-3 md:px-4' : 'px-4'}`}>
      <div className='mb-3 flex items-center'>
        <PostUserProfile
          authorData={authorData}
          isLoading={isAuthorLoading}
          onClickProfile={onClickProfile || noopClickHandler}
          badges={statPageEnabled ? badges : undefined}
          streak={statPageEnabled ? streak : undefined}
          isStreakLoading={statPageEnabled ? isStreakLoading : false}
        />
      </div>
      <h2
        className={`flex items-center font-semibold leading-tight text-foreground ${
          isMobile ? 'text-lg md:text-xl' : 'text-xl'
        }`}
      >
        {isPrivate && (
          <Lock className='mr-1.5 size-4 shrink-0 text-muted-foreground' aria-label='비공개 글' />
        )}
        {title}
      </h2>
    </CardHeader>
  );
};
