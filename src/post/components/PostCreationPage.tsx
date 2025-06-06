import { useParams, Form, useNavigation, useActionData } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { Button } from '@/shared/ui/button';

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

  // Router automatically handles loading states during form submission
  const isSubmitting = navigation.state === 'submitting';
  
  return (
    <div className='mx-auto max-w-4xl px-6 py-8'>
      <h1 className='mb-6 text-2xl font-bold'>새 글 작성</h1>
      
      {/* React Router Form automatically submits to the route's action */}
      <Form method="post" className='space-y-6'>
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="authorId" value={currentUser?.uid} />
        
        <PostTitleEditor name="title" />
        <PostTextEditor name="content" />
        
        {actionData?.error && (
          <div className="text-red-600 text-sm">{actionData.error}</div>
        )}
        
        <div className='flex justify-end space-x-4'>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '글 저장'}
          </Button>
        </div>
      </Form>
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