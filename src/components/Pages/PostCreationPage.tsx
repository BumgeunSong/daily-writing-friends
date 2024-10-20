// src/components/PostCreationPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const PostCreationPage: React.FC = () => {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      await addDoc(collection(firestore, 'posts'), {
        title,
        content,
        authorId: currentUser?.uid,
        authorName: currentUser?.displayName,
        createdAt: serverTimestamp(),
      });
      navigate('/feed');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <div>
      <h1>새 글 작성</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">제목:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="content">내용:</label>
          <ReactQuill
            value={content}
            onChange={setContent}
          />
        </div>
        <button type="submit">게시하기</button>
      </form>
    </div>
  );
};

export default PostCreationPage;
