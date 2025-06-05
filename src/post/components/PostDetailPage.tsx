import { useLoaderData, useNavigate } from 'react-router-dom';
import Comments from '@/comment/components/Comments';
import { usePostDelete } from '@/post/hooks/usePostDelete';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUserNickname } from '@/user/hooks/useUserNickname';
import { PostAdjacentButtons } from './PostAdjacentButtons';
import { PostBackButton } from './PostBackButton';
import { PostContent } from './PostContent';
import { PostDetailHeader } from './PostDetailHeader';
import { PostMetaHelmet } from './PostMetaHelmet';
import { Post } from '@/post/model/Post';

// Type for what the loader returns
interface PostDetailData {
  post: Post;
  boardId: string;
  postId: string;
}

export default function PostDetailPage() {
  // No more useQuery! Data is provided by the loader
  const { post, boardId, postId } = useLoaderData() as PostDetailData;
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const handleDelete = usePostDelete();

  const { nickname: authorNickname } = useUserNickname(post.authorId);

  // No loading or error states - router handles them!
  // Component focuses purely on rendering
  const isAuthor = currentUser?.uid === post.authorId;

  return (
    <div className='mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-12'>
      <PostMetaHelmet post={post} boardId={boardId} postId={postId} />
      <PostBackButton className='mb-6' />
      <article className='space-y-6'>
        <PostDetailHeader
          post={post}
          authorNickname={authorNickname ?? undefined}
          isAuthor={isAuthor}
          boardId={boardId}
          postId={postId}
          onDelete={handleDelete}
          navigate={navigate}
        />
        <PostContent post={post} isAuthor={isAuthor} />
      </article>
      <div className='mt-12 border-t border-gray-200'></div>
      <PostAdjacentButtons boardId={boardId} postId={postId} />
      <div className='mt-12'>
        <Comments
          boardId={boardId}
          postId={postId}
          postAuthorId={post.authorId}
          postAuthorNickname={typeof authorNickname === 'string' ? authorNickname : null}
        />
      </div>
    </div>
  );
}

/*
Key improvements over the original:

1. ❌ OLD WAY: Manual loading/error handling
   const { data: post, isLoading, error } = useQuery(...)
   if (isLoading) return <PostDetailSkeleton />;
   if (error || !post) return <PostDetailError boardId={boardId} />;

2. ✅ NEW WAY: Router handles all loading/error states
   const { post, boardId, postId } = useLoaderData() as PostDetailData;
   
3. ❌ OLD WAY: Component has to handle data fetching concerns
4. ✅ NEW WAY: Component only focuses on rendering

This eliminates:
- 30+ lines of loading/error boilerplate per component
- Manual useQuery management 
- Inconsistent loading states across the app
- Manual error handling everywhere
*/