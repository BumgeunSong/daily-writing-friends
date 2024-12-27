import { ChevronLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { createPost } from '@/utils/postUtils';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';

export default function PostCreationPage() {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (!boardId) return;

    try {
      await createPost(boardId, title, content, currentUser?.uid, currentUser?.displayName);
      navigate(`/board/${boardId}`);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 py-8'>
      <Link to={`/board/${boardId}`}>
        <Button variant='ghost' className='mb-6'>
          <ChevronLeft className='mr-2 size-4' /> 피드로 돌아가기
        </Button>
      </Link>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <PostTitleEditor
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className='mb-4'
        />
        <PostTextEditor 
          value={content}
          onChange={setContent}
        />
        <div className='flex justify-end'>
          <Button type='submit' className='px-6'>
            게시하기
          </Button>
        </div>
      </form>
    </div>
  );
}
