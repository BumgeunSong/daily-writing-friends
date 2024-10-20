// src/components/PostDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { firestore } from '../../firebase';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Post } from '../../types/Posts';
import { useAuth } from '../../contexts/AuthContext';

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteDoc(doc(firestore, 'posts', id));
      navigate('/feed');
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        if (!id) {
          console.error('No post ID provided');
          return;
        }
        const docRef = doc(firestore, 'posts', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPost({
            id: docSnap.id,
            title: data.title,
            content: data.content,
            authorId: data.authorId,
            authorName: data.authorName,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
          });
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      }
    };

    fetchPost();
  }, [id]);

  if (!post) {
    return <div>Loading...</div>;
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
          <button onClick={handleDelete}>삭제</button>
        </div>
      )}
    </div>
  );
};

export default PostDetailPage;
