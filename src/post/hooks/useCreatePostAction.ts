import { ActionFunctionArgs, redirect } from 'react-router-dom';
import { queryClient } from '@/shared/lib/queryClient';

export async function createPostAction({ request, params }: ActionFunctionArgs) {
  const { boardId } = params;
  const formData = await request.formData();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const authorId = formData.get('authorId') as string;
  const authorName = formData.get('authorName') as string;
  const draftId = formData.get('draftId') as string | null;
  const contentJsonStr = formData.get('contentJson') as string | null;
  const contentJson = contentJsonStr ? JSON.parse(contentJsonStr) : undefined;

  // Validate required fields
  if (!title?.trim()) {
    return { error: '제목을 입력해주세요.' };
  }
  
  if (!content?.trim()) {
    return { error: '내용을 입력해주세요.' };
  }
  
  if (!boardId) {
    return { error: '게시판 ID가 누락되었습니다.' };
  }
  
  if (!authorId) {
    return { error: '사용자 인증이 필요합니다.' };
  }
  
  if (!authorName) {
    return { error: '사용자 이름이 누락되었습니다.' };
  }

  try {
    // Import the actual functions
    const { createPost } = await import('@/post/utils/postUtils');
    const { deleteDraft } = await import('@/draft/utils/draftUtils');
    const { sendAnalyticsEvent, AnalyticsEvent } = await import('@/shared/utils/analyticsUtils');

    // Create the post with optional contentJson
    await createPost(boardId, title, content, authorId, authorName, undefined, contentJson);
    
    // Send analytics
    sendAnalyticsEvent(AnalyticsEvent.CREATE_POST, {
      boardId,
      title,
      userId: authorId,
      userName: authorName
    });

    // Delete draft if it exists
    if (draftId) {
      await deleteDraft(authorId, draftId);
      
      // Remove specific draft from cache
      queryClient.removeQueries({
        queryKey: ['draft', authorId, draftId, boardId],
        exact: true
      });
      
      // Invalidate drafts list
      queryClient.invalidateQueries({
        queryKey: ['drafts', authorId],
      });
    }

    // Invalidate posts cache so BoardPage shows the new post
    queryClient.invalidateQueries({
      queryKey: ['posts', boardId],
    });

    // Invalidate streakInfo cache so completion message shows updated streak
    queryClient.invalidateQueries({
      queryKey: ['streakInfo', authorId],
    });

    // Invalidate user postings cache for completion message
    queryClient.invalidateQueries({
      queryKey: ['userPostings', authorId],
    });

    return redirect(`/create/${boardId}/completion`);
  } catch (error) {
    console.error('게시물 작성 중 오류가 발생했습니다:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = '게시물 작성 중 오류가 발생했습니다. 다시 시도해주세요.';
    
    if (error instanceof Error) {
      // Check for specific Firebase errors
      if (error.message.includes('permission-denied')) {
        errorMessage = '권한이 없습니다. 다시 로그인해주세요.';
      } else if (error.message.includes('network')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else if (error.message.includes('quota-exceeded')) {
        errorMessage = '저장 공간이 부족합니다.';
      }
    }
    
    return {
      error: errorMessage
    };
  }
}