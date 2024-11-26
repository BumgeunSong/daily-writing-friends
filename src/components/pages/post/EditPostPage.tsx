import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ChevronLeft, Save } from 'lucide-react';
import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPost } from '../../../utils/postUtils';
import { firestore } from '@/firebase';

export default function EditPostPage() {
  const { postId, boardId } = useParams<{ postId: string; boardId: string }>();
  const [content, setContent] = useState<string>('');
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useQuery(
    ['post', boardId, postId],
    () => fetchPost(boardId!, postId!),
    {
      enabled: !!boardId && !!postId,
      onSuccess: (fetchedPost) => {
        if (fetchedPost) {
          setContent(fetchedPost.content);
        }
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !postId) return;
    try {
      const docRef = doc(firestore, `boards/${boardId}/posts`, postId);
      await updateDoc(docRef, {
        content,
        updatedAt: serverTimestamp(),
      });
      navigate(`/board/${boardId}/post/${postId}`);
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const modules = {
    toolbar: [['bold'], ['link']],
  };

  if (isLoading) {
    return (
      <div className='mx-auto max-w-2xl px-4 py-8'>
        <Skeleton className='mb-4 h-12 w-3/4' />
        <Skeleton className='mb-2 h-4 w-full' />
        <Skeleton className='mb-2 h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className='mx-auto max-w-2xl px-4 py-8 text-center'>
        <h1 className='mb-4 text-2xl font-bold'>게시물을 찾을 수 없습니다.</h1>
        <Button onClick={() => navigate(`/board/${boardId}`)}>
          <ChevronLeft className='mr-2 size-4' /> 피드로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-2xl px-4 py-8'>
      <Button variant='ghost' onClick={() => navigate(`/board/${boardId}`)} className='mb-6'>
        <ChevronLeft className='mr-2 size-4' /> 피드로 돌아가기
      </Button>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className='flex flex-col space-y-2'>
            <h1 className='text-3xl font-bold'>{post.title}</h1>
            <div className='flex items-center justify-between text-sm text-muted-foreground'>
              <p>
                작성자: {post.authorName} | 작성일: {post.createdAt?.toLocaleString() || '?'}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ReactQuill
              value={content}
              onChange={setContent}
              modules={modules}
              className='min-h-[200px]'
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
