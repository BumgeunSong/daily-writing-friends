import { Heart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { usePostLikes } from '@/post/hooks/usePostLikes';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/shared/hooks/useAuth';

interface PostLikeButtonProps {
  boardId: string;
  postId: string;
  authorId: string;
}

export function PostLikeButton({ boardId, postId, authorId }: PostLikeButtonProps) {
  const { currentUser } = useAuth();
  const { hasLiked, likeCount, isLoading, toggleLike } = usePostLikes({ boardId, postId });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleLike = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setIsProcessing(true);
      await toggleLike();
    } catch (error) {
      console.error('좋아요 처리 중 오류 발생:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't show if not logged in
  if (!currentUser) {
    return null;
  }

  const isAuthor = currentUser.uid === authorId;
  const showCount = isAuthor && likeCount > 0;

  return (
    <div className='mt-6 flex items-center justify-center border-y border-border py-4'>
      <Button
        variant='ghost'
        size='sm'
        className={`
          flex items-center gap-2 rounded-full border border-border px-4 py-2 transition-all
          bg-transparent text-foreground hover:bg-muted hover:text-foreground hover:scale-105
          active:scale-95 active:bg-accent
          ${isProcessing ? 'opacity-70' : ''}
          ${isAuthor ? 'cursor-not-allowed opacity-50' : ''}
        `}
        onClick={handleToggleLike}
        disabled={isLoading || isProcessing || isAuthor}
      >
        {isProcessing ? (
          <Loader2 className='size-5 animate-spin' />
        ) : (
          <>
            <Heart className={`size-5 transition-all ${hasLiked ? 'fill-current' : ''}`} />
            <span className='text-sm font-medium'>공감</span>
            {showCount && <span className='text-sm font-semibold'>{likeCount}</span>}
          </>
        )}
      </Button>
    </div>
  );
}
