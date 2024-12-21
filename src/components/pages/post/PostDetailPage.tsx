import DOMPurify from 'dompurify';
import { deleteDoc, doc } from 'firebase/firestore';
import { ChevronLeft, Edit, Trash2 } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchUserNickname } from '@/utils/userUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { firestore } from '../../../firebase';
import { useQuery } from '@tanstack/react-query';
import { fetchPost } from '../../../utils/postUtils';
import Comments from '../comment/Comments';

const deletePost = async (boardId: string, id: string): Promise<void> => {
  await deleteDoc(doc(firestore, `boards/${boardId}/posts`, id));
};

const handleDelete = async (
  postId: string,
  boardId: string,
  navigate: (path: string) => void,
): Promise<void> => {
  const confirmDelete = window.confirm('정말로 이 게시물을 삭제하시겠습니까?');
  if (!confirmDelete) return;

  try {
    await deletePost(boardId, postId);
    navigate(`/board/${boardId}`);
  } catch (error) {
    console.error('게시물 삭제 오류:', error);
  }
};

export default function PostDetailPage() {
  const { postId, boardId } = useParams<{ postId: string; boardId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useQuery(
    ['post', boardId, postId],
    () => fetchPost(boardId!, postId!),
    {
      enabled: !!boardId && !!postId,
    }
  );

  const { data: authorNickname } = useQuery(
    ['authorNickname', post?.authorId],
    () => fetchUserNickname(post!.authorId),
    {
      enabled: !!post?.authorId,
    }
  );

  if (isLoading) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-8'>
        <Skeleton className='mb-4 h-12 w-3/4' />
        <Skeleton className='mb-2 h-4 w-full' />
        <Skeleton className='mb-2 h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-8 text-center'>
        <h1 className='mb-4 text-2xl font-bold'>게시물을 찾을 수 없습니다.</h1>
        <Link to={`/board/${boardId}`}>
          <Button>
            <ChevronLeft className='mr-2 size-4' /> 피드로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const isAuthor = currentUser?.uid === post.authorId;

  const sanitizedContent = DOMPurify.sanitize(post.content, {
    ADD_ATTR: ['target'],
    ADD_TAGS: ['a'],
  });

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <Link to={`/board/${boardId}`}>
        <Button variant='ghost' className='mb-6'>
          <ChevronLeft className='mr-2 size-4' /> 피드로 돌아가기
        </Button>
      </Link>
      <article className='space-y-6'>
        <header className='space-y-4'>
          <h1 className='text-4xl font-bold leading-tight'>{post.title}</h1>
          <div className='flex items-center justify-between text-sm text-muted-foreground'>
            <p>
              작성자: {authorNickname || '??'} | 작성일: {post.createdAt?.toLocaleString() || '?'}
            </p>
            {isAuthor && (
              <div className='flex space-x-2'>
                <Link to={`/board/${boardId}/edit/${postId}`}>
                  <Button variant='outline' size='sm'>
                    <Edit className='mr-2 size-4' /> 수정
                  </Button>
                </Link>
                {boardId && postId && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleDelete(postId!, boardId!, (path) => navigate(path))}
                  >
                    <Trash2 className='mr-2 size-4' /> 삭제
                  </Button>
                )}
              </div>
            )}
          </div>
        </header>
        <div
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          className='prose prose-lg max-w-none'
        />
      </article>
      <div className='mt-12 border-t border-gray-200'></div>
      <div className='mt-12'>
        {boardId && postId && <Comments boardId={boardId} postId={postId} />}
      </div>
    </div>
  );
}
