// src/components/PostDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { firestore } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Post } from '../../types/Posts';
import { useAuth } from '../../contexts/AuthContext';

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const { currentUser } = useAuth();

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
      <h1>Post Details</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
      <p>
        By {post.authorName} on {post.createdAt.toLocaleString()}
      </p>
      {isAuthor && (
        <div>
          {/* Implement edit and delete functionalities */}
          <button>Edit</button>
          <button>Delete</button>
        </div>
      )}
    </div>
  );
};

export default PostDetailPage;
