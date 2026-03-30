import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchCurrentUserMission } from '@/topic/api/topicMissionApi';
import { useAssignedPresenter } from '@/topic/hooks/useAssignedPresenter';

interface PresenterBannerProps {
  boardId: string;
}

export function PresenterBanner({ boardId }: PresenterBannerProps) {
  const { currentUser } = useAuth();
  const { assignedPresenter, isLoading: isLoadingPresenter } = useAssignedPresenter(boardId);

  const { data: currentUserMission } = useQuery({
    queryKey: ['topic_missions', 'current_user', boardId, currentUser?.uid],
    queryFn: () => fetchCurrentUserMission(boardId, currentUser!.uid),
    enabled: Boolean(currentUser?.uid) && Boolean(assignedPresenter),
  });

  if (isLoadingPresenter || !assignedPresenter) return null;

  const isAssignedPresenter = currentUser?.uid === assignedPresenter.userId;
  const presenterName = assignedPresenter.userName ?? '알 수 없음';

  if (isAssignedPresenter) {
    return (
      <div className="mx-3 mb-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 md:mx-4">
        <p className="text-sm font-semibold text-foreground">당신이 다음 발표자입니다</p>
        <p className="mt-1 text-sm text-muted-foreground">발표 주제: {assignedPresenter.topic}</p>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-4 rounded-lg border border-border/50 bg-card px-4 py-3 reading-shadow md:mx-4">
      <p className="text-sm font-semibold text-foreground">
        다음 발표자: {presenterName}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        발표 주제: {assignedPresenter.topic}
      </p>
      {!currentUserMission && (
        <Link
          to={`/board/${boardId}/topic`}
          className="mt-2 inline-block text-sm text-ring hover:underline"
        >
          발표 주제 등록하기
        </Link>
      )}
    </div>
  );
}
