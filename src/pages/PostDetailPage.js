import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { firestore } from '../firebase';

const PostDetailPage = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const doc = await firestore.collection('posts').doc(id).get();
        if (doc.exists) {
          setPost(doc.data());
        } else {
          console.error('해당 문서가 존재하지 않습니다!');
        }
      } catch (error) {
        console.error('포스트를 가져오는 중 오류가 발생했습니다:', error);
      }
    };

    fetchPost();
  }, [id]);

  if (!post) {
    return <div>로딩 중...</div>;
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      {/* Additional post details */}
    </div>
  );
};

export default PostDetailPage;
