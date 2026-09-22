import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '@/shared/navigation';
import { toast } from 'sonner';
import { PostVisibility } from '@/post/model/Post';
import { PostJustThreeQuestionAnswerInput } from '@/post/components/PostJustThreeQuestionAnswerInput';
import { useJustThreeQuestionsSession } from '@/post/hooks/useJustThreeQuestionsSession';
import { mapCreatePostErrorMessage } from '@/post/hooks/useCreatePostAction';
import { formatJustThreeQuestionsContent } from '@/post/utils/justThreeQuestionsContentUtils';
import { countNonWhitespaceCharacters } from '@/post/utils/topicInputUtils';
import { createPost } from '@/post/utils/postUtils';
import { invalidatePostCaches, optimisticallyUpdatePostingStreak } from '@/post/utils/postCacheUtils';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { ReadingColumn } from '@/shared/ui/reading-column';
import { Stack } from '@/shared/ui/stack';
import { AnalyticsEvent, sendAnalyticsEvent } from '@/shared/utils/analyticsUtils';
import { useUserNickname } from '@/user/hooks/useUserNickname';

const TOTAL_QUESTION_COUNT = 3;
const QUESTION_LABEL_ID = 'just-three-questions-current-question';

export default function PostJustThreeQuestionsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { boardId } = useParams();
  const { nickname: userNickname } = useUserNickname(currentUser?.uid ?? null);

  const session = useJustThreeQuestionsSession();
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    sendAnalyticsEvent(AnalyticsEvent.START_JUST_THREE_QUESTIONS, { boardId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 전송
  }, []);

  const postTitle = userNickname ? `${userNickname}님의 3줄 쓰기` : '3줄 쓰기';
  const canSubmitAnswer = countNonWhitespaceCharacters(answer) > 0;
  const isLastQuestion = session.progress === TOTAL_QUESTION_COUNT - 1;

  const submitJustThreeQuestions = async (finalAnswers: typeof session.answers) => {
    if (!currentUser || !boardId) {
      toast.error('로그인 세션이 만료되었습니다. 답변을 기억해두고 페이지를 새로고침해주세요.', { position: 'bottom-center' });
      return;
    }

    setIsSubmitting(true);
    try {
      const content = formatJustThreeQuestionsContent(finalAnswers);
      const newPost = await createPost({
        boardId,
        title: postTitle,
        content,
        authorId: currentUser.uid,
        authorName: userNickname ?? '',
        visibility: PostVisibility.PUBLIC,
      });

      invalidatePostCaches(boardId, currentUser.uid);
      optimisticallyUpdatePostingStreak(currentUser.uid);
      sendAnalyticsEvent(AnalyticsEvent.FINISH_JUST_THREE_QUESTIONS, { boardId });

      navigate(`/board/${boardId}/post/${newPost.id}`, { replace: true });
    } catch (error) {
      console.error('3줄쓰기 게시 중 오류:', error);
      toast.error(mapCreatePostErrorMessage(error), { position: 'bottom-center' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (isSubmittingRef.current || !canSubmitAnswer) return;
    isSubmittingRef.current = true;

    if (!isLastQuestion) {
      session.recordAnswer(answer);
      setAnswer('');
      isSubmittingRef.current = false;
      return;
    }

    // Only commit the last answer to session state after createPost succeeds,
    // so a failed submit leaves progress/answer untouched for retry.
    const finalAnswers = [...session.answers, { question: session.currentQuestion, answer }];
    await submitJustThreeQuestions(finalAnswers);
    isSubmittingRef.current = false;
  };

  const handleSkip = () => {
    session.skip();
    setAnswer('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ReadingColumn className="grow py-8">
        <Stack gap="lg">
          <p className="text-sm text-muted-foreground tabular-nums">
            {session.progress + 1}/{TOTAL_QUESTION_COUNT}
          </p>
          <h1 id={QUESTION_LABEL_ID} className="text-2xl font-bold text-foreground text-balance">
            {session.currentQuestion}
          </h1>
          <PostJustThreeQuestionAnswerInput
            question={session.currentQuestion}
            value={answer}
            onChange={setAnswer}
            questionLabelId={QUESTION_LABEL_ID}
          />
        </Stack>
      </ReadingColumn>

      <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-background p-4">
        <ReadingColumn as="div" className="flex gap-3 py-0">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={!session.canSkip || isSubmitting}
          >
            다음 질문
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={handleNext}
            disabled={!canSubmitAnswer || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                게시 중...
              </>
            ) : isLastQuestion ? (
              '완료'
            ) : (
              '제출'
            )}
          </Button>
        </ReadingColumn>
      </div>
    </div>
  );
}
