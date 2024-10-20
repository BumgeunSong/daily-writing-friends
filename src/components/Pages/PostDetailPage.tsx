// src/components/PostDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, NavigateFunction } from 'react-router-dom';
import { firestore } from '../../firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { fetchPost } from '../../utils/postUtils';
import { Post } from '../../types/Posts';
import { useAuth } from '../../contexts/AuthContext';
import BackToFeedButton from '../Pages/BackToFeedButton';

const deletePost = async (id: string): Promise<void> => {
  await deleteDoc(doc(firestore, 'posts', id));
};

const handleDelete = async (id: string, navigate: NavigateFunction): Promise<void> => {
  if (!id) return;

  const confirmDelete = window.confirm('정말로 이 게시물을 삭제하시겠습니까?');
  if (!confirmDelete) return;

  try {
    await deletePost(id);
    navigate('/feed');
  } catch (error) {
    console.error('게시물 삭제 오류:', error);
  }
};

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        console.error('게시물 ID가 제공되지 않았습니다');
        setIsLoading(false);
        return;
      }

      try {
        const fetchedPost = await fetchPost(id);
        setPost(fetchedPost);
      } catch (error) {
        console.error('게시물 가져오기 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [id]);

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  if (!post) {
    return <div>게시물을 찾을 수 없습니다.</div>;
  }

  const isAuthor = currentUser?.uid === post.authorId;

  return (
    <div>
      <BackToFeedButton />
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
      <p>
        작성자: {post.authorName} | 작성일: {post.createdAt.toLocaleString()}
      </p>
      {isAuthor && (
        <div>
          <button onClick={() => navigate(`/edit/${id}`)}>수정</button>
          <button onClick={() => handleDelete(id!, navigate)}>삭제</button>
        </div>
      )}
    </div>
  );
};

export default PostDetailPage;
