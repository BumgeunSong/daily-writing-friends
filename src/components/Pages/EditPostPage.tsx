import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firestore } from '../../firebase';
import { fetchPost } from '../../utils/postUtils';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import BackToFeedButton from './BackToFeedButton';

const EditPostPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [content, setContent] = useState<string>('');
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const loadPost = async () => {
            if (!id) return;
            const post = await fetchPost(id);
            if (!post) return;
            setContent(post.content);
        }
        loadPost();
    }, [id, currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        if (!id) return;
      
        try {
          const docRef = doc(firestore, 'posts', id);
          await updateDoc(docRef, {
            content,
            updatedAt: serverTimestamp(),
          });
          navigate(`/post/${id}`);
        } catch (error) {
          console.error('Error updating post:', error);
        }
      };      

    return (
        <div>
            <h1>글 수정하기</h1>
            <BackToFeedButton />
            <form onSubmit={handleSubmit}>
                <ReactQuill value={content} onChange={setContent} />
                <button type="submit">수정</button>
            </form>
        </div>
    );
};



export default EditPostPage;