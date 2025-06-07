import { useParams, Form, useNavigation, useActionData } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { Button } from '@/shared/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/alert-dialog';

// Type for action data (errors, success messages, etc.)
interface ActionData {
  error?: string;
  success?: boolean;
}

export default function PostCreationPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { currentUser } = useAuth();
  const navigation = useNavigation();
  const actionData = useActionData() as ActionData;
  
  // State for controlled form inputs
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Router automatically handles loading states during form submission
  const isSubmitting = navigation.state === 'submitting';
  
  // Show error dialog when error occurs
  useEffect(() => {
    if (actionData?.error) {
      setShowErrorDialog(true);
    }
  }, [actionData?.error]);
  
  return (
    <div className='mx-auto max-w-4xl px-6 py-8'>
      <h1 className='mb-6 text-2xl font-bold'>새 글 작성</h1>
      
      {/* React Router Form automatically submits to the route's action */}
      <Form method="post" className='space-y-6'>
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="authorId" value={currentUser?.uid} />
        <input type="hidden" name="authorName" value={currentUser?.displayName || currentUser?.email || 'Anonymous'} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="content" value={content} />
        
        <PostTitleEditor 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
        />
        <PostTextEditor 
          value={content} 
          onChange={setContent} 
        />
        
        <div className='flex justify-end space-x-4'>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()}>
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
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/*
Key improvements with React Router actions:

1. ❌ OLD WAY: Manual useMutation with loading states
   const [isSubmitting, setIsSubmitting] = useState(false);
   const createMutation = useMutation({
     mutationFn: createPost,
     onSuccess: () => {
       queryClient.invalidateQueries(['posts', boardId]);
       navigate(`/board/${boardId}`);
     },
     onError: (error) => {
       setError(error.message);
     }
   });

2. ✅ NEW WAY: Router handles everything
   - Form submission goes to route action
   - Loading state via useNavigation()
   - Errors via useActionData()
   - Automatic revalidation after mutations
   - Automatic redirect on success

This eliminates:
- Manual cache invalidation
- Manual loading state management  
- Manual error handling in mutations
- Manual navigation after success
- Complex mutation logic in components
*/