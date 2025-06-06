import { ActionFunctionArgs, redirect } from 'react-router-dom';

export async function createPostAction({ request, params }: ActionFunctionArgs) {
  const { boardId } = params;
  const formData = await request.formData();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const authorId = formData.get('authorId') as string;
  const authorName = formData.get('authorName') as string;
  const draftId = formData.get('draftId') as string | null;

  if (!title?.trim() || !content?.trim() || !boardId || !authorId) {
    return {
      error: '필수 정보가 누락되었습니다.'
    };
  }

  try {
    // Import the actual functions
    const { createPost } = await import('@/post/utils/postUtils');
    const { deleteDraft } = await import('@/draft/utils/draftUtils');
    const { sendAnalyticsEvent, AnalyticsEvent } = await import('@/shared/utils/analyticsUtils');

    // Create the post
    await createPost(boardId, title, content, authorId, authorName);
    
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
    }

    // React Router automatically revalidates all loaders after actions!
    // No manual cache invalidation needed!
    return redirect(`/create/${boardId}/completion`);
  } catch (error) {
    console.error('게시물 작성 중 오류가 발생했습니다:', error);
    return {
      error: '게시물 작성 중 오류가 발생했습니다. 다시 시도해주세요.'
    };
  }
}