import type { ActionFunctionArgs} from 'react-router-dom';
import { redirect } from 'react-router-dom';
import { deleteDraft } from '@/draft/utils/draftUtils';
import {
  invalidateDraftCaches,
  invalidatePostCaches,
  optimisticallyUpdatePostingStreak,
} from '@/post/utils/postCacheUtils';
import { createPost } from '@/post/utils/postUtils';
import { sendAnalyticsEvent, AnalyticsEvent } from '@/shared/utils/analyticsUtils';

export interface ValidatedCreatePostInput {
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  boardId: string;
}

export type CreatePostValidation =
  | { valid: true; input: ValidatedCreatePostInput }
  | { valid: false; error: string };

/**
 * Pure validation: read required string fields out of FormData and verify they
 * are non-blank. boardId comes from route params, not FormData, so it is
 * passed separately. Error messages mirror the user-facing copy.
 */
export function validateCreatePostFormData(
  formData: FormData,
  boardId: string | undefined,
): CreatePostValidation {
  const title = ((formData.get('title') as string | null) ?? '').trim();
  const content = ((formData.get('content') as string | null) ?? '').trim();
  const authorId = (formData.get('authorId') as string | null) ?? '';
  const authorName = (formData.get('authorName') as string | null) ?? '';

  if (!title) return { valid: false, error: '제목을 입력해주세요.' };
  if (!content) return { valid: false, error: '내용을 입력해주세요.' };
  if (!boardId) return { valid: false, error: '게시판 ID가 누락되었습니다.' };
  if (!authorId) return { valid: false, error: '사용자 인증이 필요합니다.' };
  if (!authorName) return { valid: false, error: '사용자 이름이 누락되었습니다.' };

  return { valid: true, input: { title, content, authorId, authorName, boardId } };
}

/**
 * Pure error-string mapping: turns a thrown error from createPost into the
 * Korean message shown to the user. Falls back to a generic message when the
 * error is unrecognized or not an Error instance.
 */
export function mapCreatePostErrorMessage(error: unknown): string {
  const fallback = '게시물 작성 중 오류가 발생했습니다. 다시 시도해주세요.';
  if (!(error instanceof Error)) return fallback;
  if (error.message.includes('permission-denied')) return '권한이 없습니다. 다시 로그인해주세요.';
  if (error.message.includes('network')) return '네트워크 연결을 확인해주세요.';
  if (error.message.includes('quota-exceeded')) return '저장 공간이 부족합니다.';
  return fallback;
}

export async function createPostAction({ request, params }: ActionFunctionArgs) {
  const { boardId } = params;
  const formData = await request.formData();

  const validation = validateCreatePostFormData(formData, boardId);
  if (!validation.valid) {
    return { error: validation.error };
  }
  const { title, content, authorId, authorName, boardId: validBoardId } = validation.input;

  const draftId = formData.get('draftId') as string | null;
  const contentJsonStr = formData.get('contentJson') as string | null;
  const contentJson = contentJsonStr ? JSON.parse(contentJsonStr) : undefined;

  try {
    await createPost({ boardId: validBoardId, title, content, authorId, authorName, contentJson });

    sendAnalyticsEvent(AnalyticsEvent.CREATE_POST, {
      boardId: validBoardId,
      title,
      userId: authorId,
      userName: authorName,
    });

    if (draftId) {
      await deleteDraft(authorId, draftId);
      invalidateDraftCaches(authorId, draftId, validBoardId);
    }

    invalidatePostCaches(validBoardId, authorId);
    optimisticallyUpdatePostingStreak(authorId);

    return redirect(`/create/${validBoardId}/completion?contentLength=${content.length}`);
  } catch (error) {
    console.error('게시물 작성 중 오류가 발생했습니다:', error);
    return { error: mapCreatePostErrorMessage(error) };
  }
}
