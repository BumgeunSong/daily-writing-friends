import { Lock } from 'lucide-react';
import { CardHeader } from '@/shared/ui/card';
import { PostAuthorData, PostUserProfile } from './PostUserProfile';

interface PostCardHeaderProps {
  title: string;
  isPrivate: boolean;
  authorData: PostAuthorData;
  isAuthorLoading: boolean;
  badges?: any;
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
          onClickProfile={onClickProfile || (() => {})}
          badges={statPageEnabled ? badges : undefined}
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
