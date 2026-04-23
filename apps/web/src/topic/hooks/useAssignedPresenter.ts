import { useQuery } from '@tanstack/react-query';
import type { AssignedPresenter } from '@/topic/model/TopicMission';
import { fetchAssignedPresenter } from '@/topic/api/topicMissionApi';

interface UseAssignedPresenterResult {
  assignedPresenter: AssignedPresenter | null | undefined;
  isLoading: boolean;
}

export function useAssignedPresenter(boardId: string): UseAssignedPresenterResult {
  const { data: assignedPresenter, isLoading } = useQuery<AssignedPresenter | null>({
    queryKey: ['topic_missions', 'assigned', boardId],
    queryFn: () => fetchAssignedPresenter(boardId),
    enabled: Boolean(boardId),
    staleTime: 30_000,
  });

  return { assignedPresenter, isLoading };
}
