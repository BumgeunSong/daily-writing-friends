import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { fetchAdjacentPosts } from '@/post/utils/postUtils';

interface PostAdjacentButtonsProps {
  boardId: string;
  postId: string;
}

export function PostAdjacentButtons({ boardId, postId }: PostAdjacentButtonsProps) {
  const { data: adjacentPosts } = useQuery(
    ['adjacentPosts', boardId, postId],
    () => fetchAdjacentPosts(boardId, postId),
    {
      enabled: !!boardId && !!postId,
    }
  );

  return (
    <div className='flex gap-4'>
      {adjacentPosts?.prevPost ? (
        <Link to={`/board/${boardId}/post/${adjacentPosts.prevPost}`}>
          <Button
            variant='ghost'
            className='px-0 text-foreground hover:bg-transparent hover:text-foreground'
          >
            <ChevronLeft className='mr-2 size-4' /> 이전 글
          </Button>
        </Link>
      ) : (
        <Button variant='ghost' disabled className='px-0 text-muted-foreground'>
          <ChevronLeft className='mr-2 size-4' /> 이전 글
        </Button>
      )}
      {adjacentPosts?.nextPost ? (
        <Link to={`/board/${boardId}/post/${adjacentPosts.nextPost}`}>
          <Button
            variant='ghost'
            className='px-0 text-foreground hover:bg-transparent hover:text-foreground'
          >
            다음 글 <ChevronRight className='ml-2 size-4' />
          </Button>
        </Link>
      ) : (
        <Button variant='ghost' disabled className='px-0 text-muted-foreground'>
          다음 글 <ChevronRight className='ml-2 size-4' />
        </Button>
      )}
    </div>
  );
}
