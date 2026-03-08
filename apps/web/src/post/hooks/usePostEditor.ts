import { useState, useEffect } from 'react';
import type { Draft } from '@/draft/model/Draft';

interface UsePostEditorProps {
  initialDraft: Draft | null;
  initialTitle?: string;
  initialContent?: string;
}

interface UsePostEditorResult {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
}

export function usePostEditor({ initialDraft, initialTitle = '', initialContent = '' }: UsePostEditorProps): UsePostEditorResult {
  const [title, setTitle] = useState<string>(initialDraft ? initialDraft.title : initialTitle);
  const [content, setContent] = useState<string>(initialDraft ? initialDraft.content : initialContent);

  // 초안 데이터가 로드되면 상태 업데이트
  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.title);
      setContent(initialDraft.content);
    }
  }, [initialDraft]);

  return { title, setTitle, content, setContent };
} 