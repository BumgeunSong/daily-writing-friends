import { ChevronLeft, Save, WifiOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPost, updatePost } from '../../../utils/postUtils';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { PostBackButton } from './PostBackButton';
import { toast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';


export default function PostEditPage() {
  const { postId, boardId } = useParams<{ postId: string; boardId: string }>();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  // 오프라인 상태일 때 게시물 상세 페이지로 리디렉션
  useEffect(() => {
    if (!isOnline && boardId && postId) {
      navigate(`/board/${boardId}/post/${postId}`);
    }
  }, [isOnline, boardId, postId, navigate]);

  const { data: post, isLoading, error } = useQuery(
    ['post', boardId, postId],
    () => fetchPost(boardId!, postId!),
    {
      enabled: !!boardId && !!postId && isOnline,
      onSuccess: (fetchedPost) => {
        if (fetchedPost) {
          setTitle(fetchedPost.title);
          setContent(fetchedPost.content);
        }
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !postId || !isOnline) return;
    try {
      await updatePost(boardId!, postId!, title, content);
      navigate(`/board/${boardId}/post/${postId}`);
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "오류",
        description: "게시물 수정에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 오프라인 상태 메시지
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <WifiOff className="size-12 mx-auto mb-4 text-amber-500" />
          <h1 className="text-2xl font-bold mb-2">오프라인 상태입니다</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            오프라인 상태에서는 게시물을 수정할 수 없습니다.
            인터넷에 연결된 후 다시 시도해주세요.
          </p>
          <Button onClick={() => navigate(`/board/${boardId}/post/${postId}`)}>
            게시물로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 py-8'>
        <Skeleton className='mb-4 h-12 w-3/4' />
        <Skeleton className='mb-2 h-4 w-full' />
        <Skeleton className='mb-2 h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 py-8 text-center'>
        <h1 className='mb-4 text-2xl font-bold'>게시물을 찾을 수 없습니다.</h1>
        <Button onClick={() => navigate(`/board/${boardId}`)}>
          <ChevronLeft className='mr-2 size-4' /> 피드로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 py-8'>
      {boardId && <PostBackButton boardId={boardId} className='mb-6' />}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className='flex flex-col space-y-2'>
            <PostTitleEditor
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isOnline}
            />
            <div className='flex items-center justify-between text-sm text-muted-foreground'>
              <p>
                작성자: {post.authorName} | 작성일: {post.createdAt?.toLocaleString() || '?'}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <PostTextEditor
              value={content}
              onChange={setContent}
              placeholder='내용을 수정하세요...'
            />
          </CardContent>
          <CardFooter className='flex justify-end'>
            <Button 
              type='submit'
              disabled={!isOnline || !title.trim() || !content.trim()}
            >
              <Save className='mr-2 size-4' /> 수정 완료
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

