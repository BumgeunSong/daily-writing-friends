import { useState, useEffect } from 'react';
import { useParams, Form, useNavigation, useActionData, useSearchParams } from 'react-router-dom';
import { DraftsDrawer } from '@/draft/components/DraftsDrawer';
import { DraftStatusIndicator } from '@/draft/components/DraftStatusIndicator';
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
import { PostTitleEditor } from './PostTitleEditor';

// Type for action data (errors, success messages, etc.)
interface ActionData {
  error?: string;
  success?: boolean;
}

/**
 * Safely stringify JSON data with error handling
 * Handles circular references and non-serializable data
 */
function safeStringifyJson(data: any): string {
  if (!data) return '';

  try {
    // First, try normal JSON.stringify
    return JSON.stringify(data);
  } catch (error) {
    console.warn(
      'Failed to stringify contentJson, attempting with circular reference handling:',
      error,
    );

    try {
      // Handle circular references by replacing them with a placeholder
      const seen = new WeakSet();
      const result = JSON.stringify(data, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }

        // Handle non-serializable data types
        if (typeof value === 'function') {
          return '[Function]';
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (value === undefined) {
          return null;
        }

        return value;
      });

      return result;
    } catch (fallbackError) {
      console.error('JSON stringification failed completely:', fallbackError);
      // Return empty string as fallback to prevent form submission errors
      return '';
    }
  }
}

export default function PostCreationPage() {
  // 1단계: 임시저장글 불러오기
  const { currentUser } = useAuth();
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const initialTitle = searchParams.get('title') || '';
  const initialContent = searchParams.get('content') || '';

  const {
    draft,
    draftId: loadedDraftId,
    error: draftError,
  } = useDraftLoader({
    userId: currentUser?.uid,
    boardId,
    draftId,
  });

  const navigation = useNavigation();
  const actionData = useActionData() as ActionData;

  // State for controlled form inputs
  const { title, setTitle, content, setContent } = usePostEditor({
    initialDraft: draft,
    initialTitle,
    initialContent,
  });
  const [contentJson, setContentJson] = useState<any>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Router automatically handles loading states during form submission
  const isSubmitting = navigation.state === 'submitting';

  // Show error dialog when error occurs
  useEffect(() => {
    if (actionData?.error) {
      setShowErrorDialog(true);
    }
  }, [actionData?.error]);

  // 3단계: 자동 임시저장
  const { lastSavedAt, isSaving, savingError } = useAutoSaveDrafts({
    boardId: boardId || '',
    userId: currentUser?.uid,
    title,
    content,
    initialDraftId: loadedDraftId || undefined,
    intervalMs: 10000,
  });
  return (
    <div className='mx-auto max-w-4xl px-6 py-8'>
      {/* React Router Form automatically submits to the route's action */}
      <Form method='post' className='space-y-6'>
        <input type='hidden' name='boardId' value={boardId} />
        <input type='hidden' name='authorId' value={currentUser?.uid} />
        <input
          type='hidden'
          name='authorName'
          value={currentUser?.displayName || currentUser?.email || 'Anonymous'}
        />
        <input type='hidden' name='title' value={title} />
        <input type='hidden' name='content' value={content} />
        <input type='hidden' name='contentJson' value={safeStringifyJson(contentJson)} />

        <PostTitleEditor value={title} onChange={(e) => setTitle(e.target.value)} />
        <PostEditor
          value={content}
          onChange={setContent}
          contentJson={contentJson}
          onJsonChange={setContentJson}
        />

        {/* 임시 저장 상태 표시 컴포넌트 */}
        <DraftStatusIndicator
          isSaving={isSaving}
          savingError={draftError || savingError}
          lastSavedAt={lastSavedAt}
        />
        <div className='flex justify-between space-x-4'>
          <DraftsDrawer userId={currentUser?.uid} boardId={boardId}>
            <Button variant='outline' size='default' className='flex items-center'>
              임시 저장 글
            </Button>
          </DraftsDrawer>
          <Button
            variant='default'
            type='submit'
            disabled={isSubmitting || !title.trim() || !content.trim()}
          >
            {isSubmitting ? '저장 중...' : '글 저장'}
          </Button>
        </div>
      </Form>

      {/* Error Dialog */}
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
