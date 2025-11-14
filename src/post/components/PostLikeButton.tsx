import { Heart } from 'lucide-react';
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
  const { hasLiked, likeCount, toggleLike } = usePostLikes({ boardId, postId });

  const handleToggleLike = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      await toggleLike();
    } catch (error) {
      console.error('좋아요 처리 중 오류 발생:', error);
    }
  };

  // Don't show if not logged in
  if (!currentUser) {
    return null;
  }

  const isAuthor = currentUser.uid === authorId;
  const showCount = isAuthor && likeCount > 0;

  return (
    <Button
      variant='ghost'
      size='sm'
      className={`
        flex items-center gap-2 rounded-full border border-border px-4 py-2 transition-all
        bg-transparent text-foreground hover:bg-muted hover:text-foreground hover:scale-105
        active:scale-95
        ${isAuthor ? 'cursor-not-allowed opacity-50' : ''}
      `}
      onClick={handleToggleLike}
      disabled={isAuthor}
    >
      <Heart className={`size-5 transition-all ${hasLiked ? 'fill-current' : ''}`} />
      <span className='text-sm font-medium'>공감</span>
      {showCount && <span className='text-sm font-semibold'>{likeCount}</span>}
    </Button>
  );
}
