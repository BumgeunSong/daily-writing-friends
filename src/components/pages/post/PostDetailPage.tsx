import { deleteDoc, doc } from 'firebase/firestore';
import { AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchUserNickname } from '@/utils/userUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { firestore } from '../../../firebase';
import { useQuery } from '@tanstack/react-query';
import { fetchPost } from '../../../utils/postUtils';
import Comments from '../comment/Comments';
import { PostBackButton } from './PostBackButton';
import { PostAdjacentButtons } from './PostAdjacentButtons';
import { sanitizePostContent } from '@/utils/contentUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import * as Sentry from '@sentry/react';
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
        {boardId && <PostBackButton boardId={boardId} />}
      </div>
    );
  }

  const isAuthor = currentUser?.uid === post.authorId;

  const sanitizedContent = sanitizePostContent(post.content);
  const renderContent = () => {
    if (!post?.content) {
      return <p>내용이 없습니다.</p>;
    }

    try {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          className="prose prose-lg prose-slate dark:prose-invert max-w-none mt-6
            prose-h1:text-3xl prose-h1:font-semibold 
            prose-h2:text-2xl prose-h2:font-semibold
            prose-p:my-4
            prose-ul:my-4
            prose-ol:my-4
            "
        />
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error('알 수 없는 렌더링 오류가 발생했습니다.');
      
      Sentry.captureException(err, {
        extra: {
          postId,
          boardId,
        },
      });
      
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="size-4" />
          <AlertTitle>렌더링 오류</AlertTitle>
          <AlertDescription className="mt-2">
            <p>콘텐츠를 화면에 표시하는 중에 문제가 발생했습니다:</p>
            <p className="mt-1 text-sm font-mono bg-red-50 p-2 rounded">
              {err.message}
            </p>
            <p className="mt-2 text-sm">
              페이지를 새로고침하거나 나중에 다시 시도해주세요.
              문제가 계속되면 관리자에게 문의해주세요.
            </p>
          </AlertDescription>
        </Alert>
      );
    }
  };

  return (
    <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 py-8'>
      {boardId && <PostBackButton boardId={boardId} className='mb-6' />}
      <article className='space-y-6'>
        <header className='space-y-4'>
          <h1 className='text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl mb-4'>{post.title}</h1>
          <div className='flex items-center justify-between text-sm text-gray-500 dark:text-gray-400'>
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
        {renderContent()}
      </article>
      <div className='mt-12 border-t border-gray-200'></div>
      {boardId && postId && <PostAdjacentButtons boardId={boardId} postId={postId} />}
      <div className='mt-12'>
        {boardId && postId && <Comments boardId={boardId} postId={postId} postAuthorId={post.authorId} postAuthorNickname={authorNickname || null} />}
      </div>
    </div>
  );
}
