import { ChevronLeft, Save } from 'lucide-react';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { extractFirstImageUrl, fetchPost, updatePost } from '../../../utils/postUtils';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { PostBackButton } from './PostBackButton';
import { toast } from '@/hooks/use-toast';


export default function PostEditPage() {
  const { postId, boardId } = useParams<{ postId: string; boardId: string }>();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useQuery(
    ['post', boardId, postId],
    () => fetchPost(boardId!, postId!),
    {
      enabled: !!boardId && !!postId,
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
    if (!title.trim() || !content.trim() || !postId) return;
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
            <Button type='submit'>
              <Save className='mr-2 size-4' /> 수정 완료
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

