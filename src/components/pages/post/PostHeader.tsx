import React from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '../../../firebase';

interface PostHeaderProps {
  title?: string;
  authorName?: string | null;
  createdAt?: Date;
  isAuthor: boolean;
  isOnline: boolean;
  boardId: string;
  postId: string;
  onDelete: (path: string) => void;
}

const PostHeader: React.FC<PostHeaderProps> = ({
  title,
  authorName,
  createdAt,
  isAuthor,
  isOnline,
  boardId,
  postId,
  onDelete
}) => {
  const handleDelete = async () => {
    const confirmDelete = window.confirm('정말로 이 게시물을 삭제하시겠습니까?');
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(firestore, `boards/${boardId}/posts`, postId));
      onDelete(`/board/${boardId}`);
    } catch (error) {
      console.error('게시물 삭제 오류:', error);
    }
  };

  return (
    <header className='space-y-4'>
      <h1 className='text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl mb-4'>
        {title || <Skeleton className="h-12 w-3/4" />}
      </h1>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 dark:text-gray-400 gap-4'>
        <p>
          작성자: {authorName || '??'} | 
          작성일: {createdAt?.toLocaleString() || '?'}
        </p>
        {isAuthor && isOnline && (
          <div className='flex space-x-2'>
            <Link to={`/board/${boardId}/edit/${postId}`}>
              <Button variant='outline' size='sm'>
                <Edit className='mr-2 size-4' /> 수정
              </Button>
            </Link>
            <Button
              variant='outline'
              size='sm'
              onClick={handleDelete}
            >
              <Trash2 className='mr-2 size-4' /> 삭제
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default PostHeader; 