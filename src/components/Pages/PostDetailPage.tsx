// src/components/PostDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { firestore } from '../../firebase';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Post } from '../../types/Posts';
import { useAuth } from '../../contexts/AuthContext';

const fetchPost = async (id: string): Promise<Post | null> => {
  const docRef = doc(firestore, 'posts', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    console.log('해당 문서가 없습니다!');
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title,
    content: data.content,
    authorId: data.authorId,
    authorName: data.authorName,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

const deletePost = async (id: string): Promise<void> => {
  await deleteDoc(doc(firestore, 'posts', id));
};

const handleDelete = async (id: string, navigate: NavigateFunction): Promise<void> => {
  if (!id) return;
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
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
      <p>
        작성자: {post.authorName} | 작성일: {post.createdAt.toLocaleString()}
      </p>
      {isAuthor && (
        <div>
          <button>수정</button>
          <button onClick={() => handleDelete(id!, navigate)}>삭제</button>
        </div>
      )}
    </div>
  );
};

export default PostDetailPage;
