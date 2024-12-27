import { ChevronLeft } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { createPost } from '@/utils/postUtils';
import { PostTextEditor } from './PostTextEditor';

const TitleInput = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.style.height = 'auto';
      innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
    }
  }, [props.value]);

  useEffect(() => {
    if (typeof ref === 'function') {
      ref(innerRef.current);
    } else if (ref) {
      ref.current = innerRef.current;
    }
  }, [ref]);

  return (
    <textarea
      ref={innerRef}
      className={cn(
        'w-full resize-none overflow-hidden text-3xl font-bold focus:outline-none placeholder:text-muted-foreground',
        className,
      )}
      rows={1}
      {...props}
    />
  );
});

TitleInput.displayName = 'TitleInput';

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
    <div className='mx-auto max-w-3xl px-4 py-8'>
      <Link to={`/board/${boardId}`}>
        <Button variant='ghost' className='mb-6'>
          <ChevronLeft className='mr-2 size-4' /> 피드로 돌아가기
        </Button>
      </Link>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <TitleInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='제목을 입력하세요'
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
