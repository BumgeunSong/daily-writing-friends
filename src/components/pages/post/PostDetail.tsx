import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPost } from '@/utils/postUtils';
import { sanitizePostContent } from '@/utils/contentUtils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import OfflineBanner from '@/components/common/OfflineBanner';

interface PostDetailProps {
  boardId: string;
  postId: string;
}

const PostDetail: React.FC<PostDetailProps> = ({ boardId, postId }) => {
  const isOnline = useOnlineStatus();
  
  // Suspense를 위해 useQuery의 suspense 옵션을 true로 설정
  const { data: post } = useQuery({
    queryKey: ['post', boardId, postId],
    queryFn: () => fetchPost(boardId, postId),
    suspense: true,
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 24 * 60 * 60 * 1000, // 24시간
    refetchOnWindowFocus: isOnline, // 온라인 상태일 때만 창 포커스 시 새로고침
    refetchOnReconnect: true, // 네트워크 재연결 시 새로고침
  });

  if (!post) {
    return <div>게시물을 찾을 수 없습니다.</div>;
  }

  return (
    <>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: sanitizePostContent(post.content) }} />
      </div>
      
      {!isOnline && (
        <OfflineBanner 
          message="오프라인 모드: 캐시된 게시물 내용만 표시됩니다" 
          className="mt-6" 
        />
      )}
    </>
  );
};

export default PostDetail; 