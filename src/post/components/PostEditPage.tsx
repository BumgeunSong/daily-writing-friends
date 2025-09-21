import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import React, { useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Initialize Quill blots for editor functionality
import '../quill-register';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { toast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatDate } from '@/shared/utils/dateUtils';
import { fetchPost, updatePost } from '@/post/utils/postUtils';
import { PostBackButton } from './PostBackButton';
import { PostEditor } from './PostEditor';
import { PostTitleEditor } from './PostTitleEditor';

// 메인 컴포넌트
export default function PostEditPage() {
  const { postId, boardId } = useParams<{ postId: string; boardId: string }>();

  if (!boardId || !postId) {
    return <ErrorState error={new Error('게시판 또는 게시물 ID가 없습니다.')} />;
  }

  return (
    <ErrorBoundary fallback={(error) => <ErrorState error={error} />}>
      <Suspense fallback={<LoadingState />}>
        <PostEditForm boardId={boardId} postId={postId} />
      </Suspense>
    </ErrorBoundary>
  );
}

// 로딩 상태 컴포넌트
function LoadingState() {
  return (
    <div className='mx-auto max-w-4xl px-6 py-8'>
      <Skeleton className='mb-4 h-12 w-3/4' />
      <Skeleton className='mb-2 h-4 w-full' />
      <Skeleton className='mb-2 h-4 w-full' />
      <Skeleton className='h-4 w-2/3' />
    </div>
  );
}

// 에러 상태 컴포넌트
function ErrorState({ error }: { error: Error }) {
  return (
    <div className='mx-auto max-w-4xl px-6 py-8 text-center'>
      <h1 className='mb-4 text-xl font-semibold md:text-2xl'>게시물을 찾을 수 없습니다.</h1>
      <p className='mb-4 text-destructive'>{error.message}</p>
    </div>
  );
}

// 게시물 편집 폼 컴포넌트
function PostEditForm({ boardId, postId }: { boardId: string; postId: string }) {
  const navigate = useNavigate();

  // React Query의 suspense 모드 사용
  const { data: post } = useQuery(['post', boardId, postId], () => fetchPost(boardId, postId), {
    suspense: true, // Suspense 모드 활성화
    useErrorBoundary: true, // 에러를 ErrorBoundary로 전파
    refetchOnWindowFocus: false,
  });

  // 편집 상태를 관리하는 객체
  const [editState, setEditState] = useState({
    title: post?.title || '',
    content: post?.content || '',
  });

  // 제목 변경 핸들러
  const setTitle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditState((prev) => ({
      ...prev,
      title: e.target.value,
    }));
  };

  // 내용 변경 핸들러
  const setContent = (content: string) => {
    setEditState((prev) => ({
      ...prev,
      content,
    }));
  };


  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editState.title.trim() || !editState.content.trim()) return;

    try {
      await updatePost(boardId, postId, editState.title, editState.content);
      navigate(`/board/${boardId}/post/${postId}`);
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: '오류',
        description: '게시물 수정에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className='mx-auto max-w-4xl px-6 py-8'>
      <PostBackButton className='mb-2' />
      <form onSubmit={handleSubmit} className='space-y-6'>
        <input type='hidden' value={post?.boardId} />
        <input type='hidden' value={post?.authorId} />
        <input type='hidden' value={post?.authorName} />
        <input type='hidden' value={editState.title} />
        <input type='hidden' value={editState.content} />

        <PostTitleEditor value={editState.title} onChange={setTitle} />
        <PostEditor
          value={editState.content}
          onChange={setContent}
          placeholder='내용을 수정하세요...'
        />

        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <p>
            작성자: {post?.authorName || '?'} | 작성일:{' '}
            {post?.createdAt ? formatDate(post.createdAt.toDate()) : '?'}
          </p>
        </div>

        <div className='flex justify-end'>
          <Button
            variant='default'
            type='submit'
            disabled={!editState.title.trim() || !editState.content.trim()}
          >
            <Save className='mr-2 size-4' /> 수정 완료
          </Button>
        </div>
      </form>
    </div>
  );
}
