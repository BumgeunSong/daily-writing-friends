import { Edit, Trash2 } from "lucide-react";
import { Share } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from '@/shared/ui/button';
import { formatDateToKorean } from '@/shared/utils/dateUtils';
import { PostVisibility } from '@/post/model/Post';

// 헤더 UI
export function PostDetailHeader({
    post,
    authorNickname,
    isAuthor,
    boardId,
    postId,
    onDelete,
    navigate,
  }: {
    post: any;
    authorNickname: string | undefined;
    isAuthor: boolean;
    boardId?: string;
    postId?: string;
    onDelete: (boardId: string, postId: string, navigate: (path: string) => void) => void;
    navigate: (path: string) => void;
  }) {
    // Web Share API 핸들러
    const handleShare = () => {
      if (navigator.share) {
        navigator.share({
          title: post.title,
          text: post.title,
          url: window.location.href,
        });
      } else {
        // fallback: 클립보드 복사 등
        window.navigator.clipboard.writeText(window.location.href);
        alert('링크가 클립보드에 복사되었습니다.');
      }
    };
    return (
      <header className='space-y-4'>
        <div className="flex items-center gap-2">
          <h1 className='mb-4 text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl'>
            {post.title}
          </h1>
        </div>
        <div className='flex items-center justify-between text-sm text-gray-500 dark:text-gray-400'>
          <p>
            작성자: {authorNickname || '??'} | 작성일: {post.createdAt ? formatDateToKorean(post.createdAt.toDate()) : '?'}
          </p>
          <div className='flex space-x-2'>
            {/* Share 버튼: 비공개글이 아닐 때만 노출 */}
            {post.visibility !== PostVisibility.PRIVATE && (
              <Button variant='ghost' size='sm' onClick={handleShare} aria-label='공유'>
                <Share className='size-4' />
              </Button>
            )}
            {/* 수정/삭제 버튼: 작성자만 노출, 비공개글은 제외 */}
            {isAuthor && post.visibility !== PostVisibility.PRIVATE && (
              <>
                <Link to={`/board/${boardId}/edit/${postId}`}>
                  <Button variant='ghost' size='sm' aria-label='수정'>
                    <Edit className='size-4' />
                  </Button>
                </Link>
                {boardId && postId && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onDelete(boardId, postId, navigate)}
                    aria-label='삭제'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>
    );
  }
  