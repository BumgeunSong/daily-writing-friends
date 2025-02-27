import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { PostBackButton } from './PostBackButton';
import { Loader2, FileText } from 'lucide-react';
import { DraftStatusIndicator } from './DraftStatusIndicator';
import { DraftsDrawer } from './DraftsDrawer';
import { useDraftLoader } from '@/hooks/useDraftLoader';
import { usePostEditor } from '@/hooks/usePostEditor';
import { usePostSubmit } from '@/hooks/usePostSubmit';
import { useAutoSaveDrafts } from '@/hooks/useAutoSaveDrafts';

export default function PostCreationPage() {
  const { currentUser } = useAuth();
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  
  // URL 쿼리 파라미터에서 draftId 추출
  const draftId = searchParams.get('draftId');
  
  // 1. 초안 로드
  const { draft, isLoading: isDraftLoading } = useDraftLoader({
    userId: currentUser?.uid,
    boardId,
    draftId
  });
  
  // 2. 게시물 편집 상태 관리
  const { title, setTitle, content, setContent } = usePostEditor({
    initialDraft: draft
  });
  
  // 3. 자동 저장
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
  
  // 4. 게시물 제출
  const { isSubmitting, handleSubmit } = usePostSubmit({
    userId: currentUser?.uid,
    userName: currentUser?.displayName,
    boardId,
    draftId: autoDraftId,
    title,
    content
  });

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
