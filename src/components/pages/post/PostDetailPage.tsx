import React, { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../../../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPost } from '../../../utils/postUtils';
import Comments from '../comment/Comments';
import { PostBackButton } from './PostBackButton';
import { PostAdjacentButtons } from './PostAdjacentButtons';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import PostErrorBoundary from '@/components/common/PostErrorBoundary';
import { fetchUserNickname } from '@/utils/userUtils';
import PostDetail from './PostDetail';
import PostHeader from './PostHeader';

// 로딩 중 표시 컴포넌트
const PostDetailSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-6 w-1/2" />
    <Skeleton className="h-6 w-5/6" />
    <Skeleton className="h-6 w-2/3" />
    <Skeleton className="h-6 w-4/5" />
  </div>
);

export default function PostDetailPage() {
  const { postId, boardId } = useParams<{ postId: string; boardId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  // 게시물 기본 정보만 가져오기 (제목, 작성자 ID 등)
  const { data: postInfo } = useQuery({
    queryKey: ['postBasicInfo', boardId, postId],
    queryFn: () => fetchPost(boardId!, postId!),
    enabled: !!boardId && !!postId,
    staleTime: 5 * 60 * 1000,
    suspense: false, // 기본 정보는 Suspense 없이 가져옴
  });

  const { data: authorNickname } = useQuery({
    queryKey: ['authorNickname', postInfo?.authorId],
    queryFn: () => postInfo?.authorId ? fetchUserNickname(postInfo.authorId) : null,
    enabled: !!postInfo?.authorId && isOnline,
  });

  const isAuthor = currentUser?.uid === postInfo?.authorId;

  // 네트워크 상태가 변경될 때 데이터 새로고침
  React.useEffect(() => {
    if (isOnline && boardId && postId) {
      queryClient.invalidateQueries({ queryKey: ['post', boardId, postId] });
      queryClient.invalidateQueries({ queryKey: ['postBasicInfo', boardId, postId] });
    }
  }, [isOnline, boardId, postId, queryClient]);

  if (!boardId || !postId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>잘못된 URL입니다.</p>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 py-8'>
      {boardId && <PostBackButton boardId={boardId} className='mb-6' />}
      <article className='space-y-6'>
        <PostHeader 
          title={postInfo?.title} 
          authorName={authorNickname || postInfo?.authorName} 
          createdAt={postInfo?.createdAt} 
          isAuthor={isAuthor}
          isOnline={isOnline}
          boardId={boardId}
          postId={postId}
          onDelete={(path) => navigate(path)}
        />
        
        <PostErrorBoundary>
          <Suspense fallback={<PostDetailSkeleton />}>
            <PostDetail boardId={boardId} postId={postId} />
          </Suspense>
        </PostErrorBoundary>
      </article>
      
      <div className='mt-12 border-t border-gray-200 dark:border-gray-800'></div>
      
      {isOnline && <PostAdjacentButtons boardId={boardId} postId={postId} />}
      
      <div className='mt-12'>
        {isOnline ? (
          <Comments 
            boardId={boardId} 
            postId={postId} 
            postAuthorId={postInfo?.authorId || ''} 
            postAuthorNickname={authorNickname || postInfo?.authorName || null} 
          />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md text-center">
            <WifiOff className="size-5 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">
              오프라인 모드에서는 댓글을 볼 수 없습니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}