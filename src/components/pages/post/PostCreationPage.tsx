import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { createPost } from '@/utils/postUtils';
import { getDraftById, deleteDraft } from '@/utils/draftUtils';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { PostBackButton } from './PostBackButton';
import { useAutoSaveDrafts } from '@/hooks/useAutoSaveDrafts';
import { Loader2, FileText } from 'lucide-react';
import { DraftStatusIndicator } from './DraftStatusIndicator';
import { DraftsDrawer } from './DraftsDrawer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Draft } from '@/types/Draft';

export default function PostCreationPage() {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // URL 쿼리 파라미터에서 draftId 추출
  const draftId = searchParams.get('draftId');
  
  console.log("boardId:", boardId);
  console.log("draftId from search params:", draftId);
  
  // useQuery를 사용하여 초안 로드 - 최적화된 방식
  const { isLoading: isDraftLoading, refetch } = useQuery({
    queryKey: ['draft', currentUser?.uid, draftId, boardId],
    queryFn: async () => {
      if (!draftId || !currentUser?.uid || !boardId) return null;
      
      // 캐시에서 먼저 확인 (DraftsDrawer에서 미리 저장한 데이터)
      const cachedDraft = queryClient.getQueryData(['draft', currentUser.uid, draftId, boardId]);
      console.log('Cached draft:', cachedDraft); // 디버깅용 로그 추가
      
      if (cachedDraft) {
        return cachedDraft;
      }
      
      // 캐시에 없으면 서버에서 가져오기
      console.log('Fetching draft from server...'); // 디버깅용 로그 추가
      const draft = await getDraftById(currentUser.uid, draftId);
      
      if (draft && draft.boardId === boardId) {
        return draft;
      }
      return null;
    },
    enabled: !!draftId && !!currentUser?.uid && !!boardId,
    staleTime: Infinity, // 초안은 한 번 로드하면 다시 로드할 필요가 없음
    retry: 1, // 실패 시 한 번만 재시도
    onSuccess: (data: Draft | null) => {
      console.log('Query success, data:', data); // 디버깅용 로그 추가
      if (data) {
        setTitle(data.title);
        setContent(data.content);
      }
    }
  });
  
  // 컴포넌트 마운트 시 쿼리 리페치
  useEffect(() => {
    if (draftId && currentUser?.uid && boardId) {
      refetch();
    }
  }, [draftId, currentUser?.uid, boardId, refetch]);
  
  // 자동 저장 훅 사용 - draftId가 있을 때만 initialDraftId 전달
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
    initialDraftId: draftId || undefined, // draftId가 없으면 undefined 전달
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
        
        // 캐시에서도 삭제
        queryClient.removeQueries({
          queryKey: ['draft', currentUser.uid, autoDraftId, boardId],
          exact: true
        });
        
        // 초안 목록 캐시 무효화
        queryClient.invalidateQueries({
          queryKey: ['drafts', currentUser.uid],
        });
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
      <div className="mb-6">
        {boardId && <PostBackButton boardId={boardId} />}
      </div>
      
      {/* draftId가 있을 때만 로딩 상태 표시 */}
      {draftId && isDraftLoading ? (
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
          
          <div className='flex justify-between items-center'>
            {currentUser && (
              <DraftsDrawer userId={currentUser.uid} boardId={boardId}>
                <Button variant="outline" size="default" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  초안 목록
                </Button>
              </DraftsDrawer>
            )}
            
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
