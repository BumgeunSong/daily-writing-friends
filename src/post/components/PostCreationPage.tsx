import { Loader2, FileText } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { DraftsDrawer } from '@/draft/components/DraftsDrawer';
import { DraftStatusIndicator } from '@/draft/components/DraftStatusIndicator';
import { useAutoSaveDrafts } from '@/draft/hooks/useAutoSaveDrafts';
import { useDraftLoader } from '@/draft/hooks/useDraftLoader';
import { usePostEditor } from '@/post/hooks/usePostEditor';
import { usePostSubmit } from '@/post/hooks/usePostSubmit';
import { PostBackButton } from './PostBackButton';
import { PostSubmitButton } from './PostSubmitButton';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';

export default function PostCreationPage() {
  const { currentUser } = useAuth();
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  
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
    <div className='mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-12'>
      <div className="mb-6">
        <PostBackButton />
      </div>
      
      {/* draftId가 있을 때만 로딩 상태 표시 */}
      {draftId && isDraftLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-8 animate-spin text-primary" />
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
          
          <div className='flex items-center justify-between'>
            {currentUser && (
              <DraftsDrawer userId={currentUser.uid} boardId={boardId}>
                <Button variant="outline" size="default" className="flex items-center">
                  <FileText className="mr-2 size-4" />
                  임시 저장 글
                </Button>
              </DraftsDrawer>
            )}
            
            <PostSubmitButton 
              isSubmitting={isSubmitting}
              disabled={!title.trim() || !content.trim()}
            />
          </div>
        </form>
      )}
    </div>
  );
}
