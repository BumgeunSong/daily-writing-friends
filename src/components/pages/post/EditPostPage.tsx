import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firestore } from '../../../firebase';
import { fetchPost } from '../../../utils/postUtils';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, Save } from 'lucide-react'
import { Post } from '@/types/Posts';

export default function EditPostPage() {
  const { id, boardId } = useParams<{ id: string, boardId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadPost = async () => {
      if (!id) return;
      try {
        const fetchedPost = await fetchPost(id);
        if (!fetchedPost) throw new Error('Post not found');
        setPost(fetchedPost);
        setContent(fetchedPost.content);
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPost();
  }, [id, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !id) return;
  
    try {
      const docRef = doc(firestore, 'posts', id);
      await updateDoc(docRef, {
        content,
        updatedAt: serverTimestamp(),
      });
      navigate(`/board/${boardId}/post/${id}`);
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const modules = {
    toolbar: [
      ['bold'],
      ['link', 'image'],
    ],
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">게시물을 찾을 수 없습니다.</h1>
        <Button onClick={() => navigate(`/board/${boardId}`)}>
          <ChevronLeft className="mr-2 h-4 w-4" /> 피드로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(`/board/${boardId}`)} className="mb-6">
        <ChevronLeft className="mr-2 h-4 w-4" /> 피드로 돌아가기
      </Button>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold">{post.title}</h1>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                작성자: {post.authorName} | 작성일: {post.createdAt.toLocaleString()}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ReactQuill
              value={content}
              onChange={setContent}
              modules={modules}
              className="min-h-[200px]"
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" /> 수정 완료
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}