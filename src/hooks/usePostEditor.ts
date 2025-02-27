import { useState, useEffect } from 'react';
import { Draft } from '@/types/Draft';

interface UsePostEditorProps {
  initialDraft: Draft | null;
}

interface UsePostEditorResult {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
}

export function usePostEditor({ initialDraft }: UsePostEditorProps): UsePostEditorResult {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');

  // 초안 데이터가 로드되면 상태 업데이트
  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.title);
      setContent(initialDraft.content);
    }
  }, [initialDraft]);

  return { title, setTitle, content, setContent };
} 