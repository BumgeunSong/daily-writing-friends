import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { PostBackButton } from './PostBackButton';
import { Loader2, FileText, WifiOff } from 'lucide-react';
import { DraftStatusIndicator } from '../draft/DraftStatusIndicator';
import { DraftsDrawer } from '../draft/DraftsDrawer';
import { useDraftLoader } from '@/hooks/useDraftLoader';
import { usePostEditor } from '@/hooks/usePostEditor';
import { usePostSubmit } from '@/hooks/usePostSubmit';
import { useAutoSaveDrafts } from '@/hooks/useAutoSaveDrafts';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useEffect } from 'react';

export default function PostCreationPage() {
  const { currentUser } = useAuth();
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  
  // 오프라인 상태일 때 게시판 페이지로 리디렉션
  useEffect(() => {
    if (!isOnline && boardId) {
      navigate(`/board/${boardId}`);
    }
  }, [isOnline, boardId, navigate]);
  
  // 1. 임시 저장 글 로드
  const { draft, draftId: loadedDraftId, isLoading: isDraftLoading } = useDraftLoader({
    userId: currentUser?.uid,
    boardId,
    draftId
  });
  
  // 2. 게시물 편집 상태 관리
  const { title, setTitle, content, setContent } = usePostEditor({
    initialDraft: draft
  });
  
  // 3. 자동 저장 - 로드된 임시 저장 글의 ID 사용
  const {
    draftId: autoDraftId,
    lastSavedAt,
    isSaving,
    savingError
  } = useAutoSaveDrafts({
    boardId: boardId || '',
    userId: currentUser?.uid,
    title,
    content,
    initialDraftId: loadedDraftId || undefined, // URL의 draftId가 아닌 로드된 임시 저장 글의 ID 사용
    autoSaveInterval: 10000,
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

  // 오프라인 상태 메시지
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <WifiOff className="size-12 mx-auto mb-4 text-amber-500" />
          <h1 className="text-2xl font-bold mb-2">오프라인 상태입니다</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            오프라인 상태에서는 게시물을 작성할 수 없습니다.
            인터넷에 연결된 후 다시 시도해주세요.
          </p>
          <Button onClick={() => navigate(`/board/${boardId}`)}>
            게시판으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 py-8'>
      <div className="mb-6">
        {boardId && <PostBackButton boardId={boardId} />}
      </div>
      
      {/* draftId가 있을 때만 로딩 상태 표시 */}
      {draftId && isDraftLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-600">임시 저장 글을 불러오는 중...</span>
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
          
          {/* 임시 저장 상태 표시 컴포넌트 */}
          <DraftStatusIndicator
            isSaving={isSaving}
            savingError={savingError}
            lastSavedAt={lastSavedAt}
          />
          
          <div className='flex justify-between items-center'>
            {currentUser && (
              <DraftsDrawer userId={currentUser.uid} boardId={boardId}>
                <Button variant="outline" size="default" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  임시 저장 글
                </Button>
              </DraftsDrawer>
            )}
            
            <Button 
              type='submit' 
              className='px-6'
              disabled={isSubmitting || !title.trim() || !content.trim() || !isOnline}
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
