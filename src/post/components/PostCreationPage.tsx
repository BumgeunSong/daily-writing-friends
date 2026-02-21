import { useState, useEffect } from 'react';
import { useParams, Form, useNavigation, useActionData, useSearchParams } from 'react-router-dom';
import { DraftsDrawer } from '@/draft/components/DraftsDrawer';
import { useAutoSaveDrafts } from '@/draft/hooks/useAutoSaveDrafts';
import { useDraftLoader } from '@/draft/hooks/useDraftLoader';
import { usePostEditor } from '@/post/hooks/usePostEditor';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { PostEditor } from './PostEditor';
import { PostEditorHeader } from './PostEditorHeader';
import { PostTitleEditor } from './PostTitleEditor';

interface ActionData {
  error?: string;
  success?: boolean;
}

export default function PostCreationPage() {
  const { currentUser } = useAuth();
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const actionData = useActionData() as ActionData;

  const draftId = searchParams.get('draftId');
  const initialTitle = searchParams.get('title') || '';
  const initialContent = searchParams.get('content') || '';

  const { draft, draftId: loadedDraftId } = useDraftLoader({
    userId: currentUser?.uid,
    boardId,
    draftId,
  });

  const { title, setTitle, content, setContent } = usePostEditor({
    initialDraft: draft,
    initialTitle,
    initialContent,
  });

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const isSubmitting = navigation.state === 'submitting';

  useEffect(() => {
    if (actionData?.error) {
      setShowErrorDialog(true);
    }
  }, [actionData?.error]);

  const { draftId: autoSavedDraftId } = useAutoSaveDrafts({
    boardId: boardId || '',
    userId: currentUser?.uid,
    title,
    content,
    initialDraftId: loadedDraftId || undefined,
    intervalMs: 10000,
    enabled: !isSubmitting,
  });

  const draftIdToSubmit = autoSavedDraftId || loadedDraftId || '';
  return (
    <div>
      <PostEditorHeader
        rightActions={
          <>
            <DraftsDrawer userId={currentUser?.uid} boardId={boardId}>
              <Button variant='outline' disabled={isImageUploading}>
                임시 저장 글
              </Button>
            </DraftsDrawer>
            <Button
              variant='default'
              type='submit'
              form='post-creation-form'
              disabled={isSubmitting || isImageUploading || !title.trim() || !content.trim()}
            >
              {isSubmitting ? '저장 중...' : '글 저장'}
            </Button>
          </>
        }
      />

      <div className='mx-auto max-w-4xl px-6 py-4'>
        <Form id='post-creation-form' method='post'>
          <input type='hidden' name='boardId' value={boardId} />
          <input type='hidden' name='authorId' value={currentUser?.uid} />
          <input
            type='hidden'
            name='authorName'
            value={currentUser?.displayName || currentUser?.email || 'Anonymous'}
          />
          <input type='hidden' name='title' value={title} />
          <input type='hidden' name='content' value={content} />
          <input type='hidden' name='draftId' value={draftIdToSubmit} />

          <PostTitleEditor value={title} onChange={(e) => setTitle(e.target.value)} />
          <PostEditor
            value={content}
            onChange={setContent}
            onUploadingChange={setIsImageUploading}
          />
        </Form>
      </div>

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>오류 발생</AlertDialogTitle>
            <AlertDialogDescription>
              {actionData?.error || '알 수 없는 오류가 발생했습니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
