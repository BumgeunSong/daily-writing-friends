import { MessageCircle, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Post } from '@/types/Posts';
import { User as Author } from '@/types/User';
import { fetchUserData } from '@/utils/userUtils';
import { Badge } from '@/components/ui/badge';
import { getContentPreview } from '@/utils/contentUtils';

interface PostCardProps {
  post: Post;
  onClick: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const contentPreview = getContentPreview(post.content);

  const { data: authorData, error } = useQuery<Author | null>(
    ['authorData', post.authorId],
    () => fetchUserData(post.authorId),
    {
      staleTime: 60 * 1000,
    }
  );

  if (error) {
    console.error('Error fetching author data:', error);
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center'>
          {post.weekDaysFromFirstDay !== undefined && (
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-1 rounded-full">
              {post.weekDaysFromFirstDay + 1}일차
            </Badge>
          )}
        </div>
        <h2 className='text-2xl font-bold'>{post.title}</h2>
        <div className='mt-2 flex items-center'>
          <Avatar className='size-8'>
            <AvatarImage
              src={authorData?.profilePhotoURL || ''}
              alt={authorData?.realName || 'User'}
            />
            <AvatarFallback>
              <User className='size-4' />
            </AvatarFallback>
          </Avatar>
          <div className='ml-2'>
            <p className='text-sm font-medium'>{authorData?.nickname}</p>
            <p className='text-xs text-muted-foreground'>
              {post.createdAt?.toLocaleString() || '?'}
            </p>
          </div>
        </div>
      </CardHeader>
      <Link to={`/board/${post.boardId}/post/${post.id}`} onClick={onClick}>
        <CardContent className='cursor-pointer px-6 transition-colors duration-200 hover:bg-muted'>
          <div
            className='
            prose prose-lg prose-slate dark:prose-invert 
            prose-p:my-3
            prose-ul:my-3
            prose-ol:my-3
            line-clamp-3'
            dangerouslySetInnerHTML={{ __html: contentPreview }}
          />
          {post.thumbnailImageURL && (
            <div className='aspect-video w-full overflow-hidden rounded-lg bg-muted'>
              <img
                src={post.thumbnailImageURL}
                alt="게시글 썸네일"
                className='h-full w-full object-cover transition-transform duration-300 hover:scale-105'
              />
            </div>
          )}
        </CardContent>
      </Link>
      <CardFooter className='pt-2'>
        <div className='flex items-center'>
          <MessageCircle className='mr-1 size-4' />
          <p className='text-sm'>{post.countOfComments + post.countOfReplies}</p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PostCard;
