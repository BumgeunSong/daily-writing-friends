import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const TitleInput = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.style.height = 'auto';
      innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
    }
  }, [props.value]);

  useEffect(() => {
    if (typeof ref === 'function') {
      ref(innerRef.current);
    } else if (ref) {
      ref.current = innerRef.current;
    }
  }, [ref]);

  return (
    <textarea
      ref={innerRef}
      className={cn(
        "w-full resize-none overflow-hidden text-3xl font-bold focus:outline-none placeholder:text-muted-foreground",
        className
      )}
      rows={1}
      {...props}
    />
  );
});

TitleInput.displayName = 'TitleInput';

export default function PostCreationPage() {
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <TitleInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="mb-4"
        />
        <div className="min-h-[300px]">
          <ReactQuill
            value={content}
            onChange={setContent}
            placeholder="내용을 입력하세요..."
            className="h-full"
            modules={{
              toolbar: [
                ['bold'],
                ['link', 'image'],
              ],
            }}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="px-6 py-2">
            게시하기
          </Button>
        </div>
      </form>
    </div>
  );
}