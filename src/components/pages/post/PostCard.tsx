import { MessageCircle, User, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Post, PostVisibility } from '@/types/Post';
import { Badge } from '@/components/ui/badge';
import { getContentPreview } from '@/utils/contentUtils';
import { formatDateToKorean } from '@/utils/dateUtils';
import { useAuthorData } from '@/hooks/useAuthorData';
import { Skeleton } from '@/components/ui/skeleton';

interface PostCardProps {
  post: Post;
  onClick: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const { authorData, isLoading: isAuthorLoading } = useAuthorData(post.authorId);

  const isPrivate = post.visibility === PostVisibility.PRIVATE;
  const contentPreview = !isPrivate ? getContentPreview(post.content) : null;

  const handleCardClick = () => {
    onClick(post.id);
  };

  return (
    <Card 
      onClick={handleCardClick} 
      className="cursor-pointer transition-colors duration-200 hover:bg-muted/50"
    >
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center'>
            {post.weekDaysFromFirstDay !== undefined && (
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-1 rounded-full mr-2">
                {post.weekDaysFromFirstDay + 1}일차
              </Badge>
            )}
          </div>
        </div>
        <h2 className='text-2xl font-bold mt-2 flex items-center'>
            {isPrivate && (
              <Lock className="size-5 text-muted-foreground mr-2 flex-shrink-0" aria-label="비공개 글" />
            )}
            {post.title}
        </h2>
        <div className='mt-2 flex items-center'>
          {isAuthorLoading ? (
             <Skeleton className="size-8 rounded-full" />
          ) : (
            <Avatar className='size-8'>
              <AvatarImage
                src={authorData?.profilePhotoURL || ''}
                alt={authorData?.realName || 'User'}
              />
              <AvatarFallback>
                <User className='size-4' />
              </AvatarFallback>
            </Avatar>
          )}
          <div className='ml-2'>
            {isAuthorLoading ? (
               <Skeleton className="h-4 w-20 mb-1" />
            ) : (
              <p className='text-sm font-medium'>{authorData?.nickname || '알 수 없음'}</p>
            )}
            <p className='text-xs text-muted-foreground'>
              {post.createdAt ? formatDateToKorean(post.createdAt.toDate()) : '날짜 없음'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className='px-6 pt-0 pb-4'>
        {!isPrivate && contentPreview && (
          <div
            className='
            prose prose-sm dark:prose-invert 
            text-muted-foreground
            prose-p:my-2
            prose-ul:my-2
            prose-ol:my-2
            line-clamp-3'
            dangerouslySetInnerHTML={{ __html: contentPreview }}
          />
        )}
        {!isPrivate && post.thumbnailImageURL && (
          <div className='mt-3 aspect-video w-full overflow-hidden rounded-md bg-muted'>
            <img
              src={post.thumbnailImageURL}
              alt="게시글 썸네일"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className='pt-0 pb-4 px-6'>
        <div className='flex items-center text-muted-foreground'>
          <MessageCircle className='mr-1.5 size-4' />
          <p className='text-xs font-medium'>{post.countOfComments + post.countOfReplies}</p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PostCard;
