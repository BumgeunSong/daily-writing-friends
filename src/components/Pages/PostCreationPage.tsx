// src/components/PostCreationPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const PostCreationPage: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await addDoc(collection(firestore, 'posts'), {
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
      <h1>Create Post</h1>
      <form onSubmit={handleSubmit}>
        <ReactQuill value={content} onChange={setContent} />
        <button type="submit">Post</button>
      </form>
    </div>
  );
};

export default PostCreationPage;
