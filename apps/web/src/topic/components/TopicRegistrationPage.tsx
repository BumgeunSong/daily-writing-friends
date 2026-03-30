import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useTopicRegistration, validateTopic } from '@/topic/hooks/useTopicRegistration';

const MAX_TOPIC_LENGTH = 200;

export default function TopicRegistrationPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [topic, setTopic] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { existingMission, isLoadingMission, register, isPending, error, isSuccess, submittedTopic } =
    useTopicRegistration({
      boardId: boardId ?? '',
      userId: currentUser?.uid,
    });

  if (!boardId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">잘못된 경로입니다.</p>
      </div>
    );
  }

  if (isLoadingMission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  if (isSuccess && submittedTopic) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/board/${boardId}`)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">발표 주제 등록</h1>
        </header>
        <main className="container mx-auto max-w-md px-4 py-10">
          <div className="rounded-lg border border-border/50 bg-card p-6 reading-shadow text-center space-y-4">
            <p className="text-lg font-semibold">등록 완료!</p>
            <p className="text-muted-foreground">
              발표 주제가 대기열에 추가되었습니다.
            </p>
            <div className="rounded-md bg-accent/10 p-3">
              <p className="text-sm font-medium text-foreground">{submittedTopic}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(`/board/${boardId}`)}
              className="w-full"
            >
              게시판으로 돌아가기
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (existingMission) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/board/${boardId}`)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">발표 주제 등록</h1>
        </header>
        <main className="container mx-auto max-w-md px-4 py-10">
          <div className="rounded-lg border border-border/50 bg-card p-6 reading-shadow space-y-4">
            <p className="font-semibold">이미 등록하셨습니다</p>
            <p className="text-sm text-muted-foreground">
              이 게시판의 발표 대기열에 이미 등록되어 있습니다.
            </p>
            <div className="rounded-md bg-accent/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">등록된 주제</p>
              <p className="text-sm font-medium">{existingMission.topic}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(`/board/${boardId}`)}
              className="w-full"
            >
              게시판으로 돌아가기
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateTopic(topic);
    if (validation) {
      setValidationError(validation.message);
      return;
    }
    setValidationError(null);
    register(topic);
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
    if (validationError) setValidationError(null);
  };

  const isOverLimit = topic.length > MAX_TOPIC_LENGTH;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/board/${boardId}`)}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">발표 주제 등록</h1>
      </header>
      <main className="container mx-auto max-w-md px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="topic" className="text-sm font-medium">
              발표 주제
            </label>
            <Input
              id="topic"
              value={topic}
              onChange={handleTopicChange}
              placeholder="발표 주제를 입력해주세요"
              className="reading-focus"
              disabled={isPending}
              maxLength={MAX_TOPIC_LENGTH + 1}
            />
            <div className="flex justify-between items-center">
              {validationError || error ? (
                <p className="text-sm text-destructive">{validationError ?? error}</p>
              ) : (
                <span />
              )}
              <p className={`text-xs ml-auto ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {topic.length}/{MAX_TOPIC_LENGTH}
              </p>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || isOverLimit}
          >
            {isPending ? '등록 중...' : '등록하기'}
          </Button>
        </form>
      </main>
    </div>
  );
}
