import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { createPost } from '@/utils/postUtils';
import { getDraftById, deleteDraft } from '@/utils/draftUtils';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { PostBackButton } from './PostBackButton';
import { useAutoSaveDrafts } from '@/hooks/useAutoSaveDrafts';
import { Loader2 } from 'lucide-react';
import { DraftStatusIndicator } from './DraftStatusIndicator';
import { useQuery } from '@tanstack/react-query';

export default function PostCreationPage() {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const location = useLocation();
  
  // URL 쿼리 파라미터에서 draftId 추출
  const queryParams = new URLSearchParams(location.search);
  const draftId = queryParams.get('draftId');
  
  // useQuery를 사용하여 초안 로드
  const { isLoading: isDraftLoading } = useQuery({
    queryKey: ['draft', currentUser?.uid, draftId, boardId],
    queryFn: async () => {
      if (!draftId || !currentUser?.uid || !boardId) return null;
      
      const draft = await getDraftById(currentUser.uid, draftId);
      if (draft && draft.boardId === boardId) {
        setTitle(draft.title);
        setContent(draft.content);
        return draft;
      }
      return null;
    },
    enabled: !!draftId && !!currentUser?.uid && !!boardId,
    staleTime: Infinity, // 초안은 한 번 로드하면 다시 로드할 필요가 없음
    retry: 1, // 실패 시 한 번만 재시도
  });
  
  // 자동 저장 훅 사용
  const {
    draftId: autoDraftId,
    lastSavedAt,
    isSaving,
    savingError,
    manualSave
  } = useAutoSaveDrafts({
    boardId: boardId || '',
    userId: currentUser?.uid,
    title,
    content,
    initialDraftId: draftId || undefined,
    autoSaveInterval: 10000
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (!boardId) return;
    
    try {
      setIsSubmitting(true);
      await createPost(boardId, title, content, currentUser?.uid, currentUser?.displayName);
      
      // 게시물 작성 성공 후 초안 삭제
      if (autoDraftId && currentUser?.uid) {
        await deleteDraft(currentUser.uid, autoDraftId);
      }
      
      navigate(`/board/${boardId}`);
    } catch (error) {
      console.error('게시물 작성 중 오류가 발생했습니다:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 py-8'>
      {boardId && <PostBackButton boardId={boardId} className='mb-6' />}
      
      {isDraftLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-600">초안을 불러오는 중...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-6'>
          <PostTitleEditor
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='mb-4'
          />
          <PostTextEditor 
            value={content}
            onChange={setContent}
          />
          
          {/* 초안 상태 표시 컴포넌트 */}
          <DraftStatusIndicator
            isSaving={isSaving}
            savingError={savingError}
            lastSavedAt={lastSavedAt}
            onManualSave={manualSave}
            isSubmitting={isSubmitting}
          />
          
          <div className='flex justify-end'>
            <Button 
              type='submit' 
              className='px-6'
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  게시 중...
                </>
              ) : (
                '게시하기'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
