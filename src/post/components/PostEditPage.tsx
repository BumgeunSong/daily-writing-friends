import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import React, { useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { toast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatDate } from '@/shared/utils/dateUtils';
import { fetchPost, updatePost } from '@/post/utils/postUtils';
import { PostEditorHeader } from './PostEditorHeader';
import { PostEditor } from './PostEditor';
import { PostTitleEditor } from './PostTitleEditor';

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

function ErrorState({ error }: { error: Error }) {
  return (
    <div className='mx-auto max-w-4xl px-6 py-8 text-center'>
      <h1 className='mb-4 text-xl font-semibold md:text-2xl'>게시물을 찾을 수 없습니다.</h1>
      <p className='mb-4 text-destructive'>{error.message}</p>
    </div>
  );
}

function PostEditForm({ boardId, postId }: { boardId: string; postId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: post } = useQuery(['post', boardId, postId], () => fetchPost(boardId, postId), {
    suspense: true,
    useErrorBoundary: true,
    refetchOnWindowFocus: false,
  });

  const [editState, setEditState] = useState({
    title: post?.title || '',
    content: post?.content || '',
    contentJson: post?.contentJson || undefined,
  });

  const setTitle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditState((prev) => ({ ...prev, title: e.target.value }));
  };

  const setContent = (content: string) => {
    setEditState((prev) => ({ ...prev, content }));
  };

  const setContentJson = (contentJson: any) => {
    setEditState((prev) => ({ ...prev, contentJson }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editState.title.trim() || !editState.content.trim()) return;

    try {
      await updatePost(boardId, postId, editState.title, editState.content, editState.contentJson);
      // Invalidate the post cache to ensure PostDetailPage shows fresh data
      queryClient.invalidateQueries(['post', boardId, postId]);
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
    <div>
      <PostEditorHeader
        rightActions={
          <Button
            variant='default'
            type='submit'
            form='post-edit-form'
            disabled={!editState.title.trim() || !editState.content.trim()}
          >
            <Save className='mr-2 size-4' /> 수정 완료
          </Button>
        }
      />

      <div className='mx-auto max-w-4xl px-6 py-4'>
        <form id='post-edit-form' onSubmit={handleSubmit} className='space-y-6'>
          <input type='hidden' value={post?.boardId} />
          <input type='hidden' value={post?.authorId} />
          <input type='hidden' value={post?.authorName} />
          <input type='hidden' value={editState.title} />
          <input type='hidden' value={editState.content} />

          <PostTitleEditor value={editState.title} onChange={setTitle} />
          <PostEditor
            value={editState.content}
            onChange={setContent}
            contentJson={editState.contentJson}
            onJsonChange={setContentJson}
            placeholder='내용을 수정하세요...'
          />

          <div className='flex items-center justify-center text-sm text-muted-foreground pt-4'>
            <p>
              작성자: {post?.authorName || '?'} | 작성일:{' '}
              {post?.createdAt ? formatDate(post.createdAt.toDate()) : '?'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
