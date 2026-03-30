import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { registerTopic, fetchCurrentUserMission } from '@/topic/api/topicMissionApi';
import type { TopicMission } from '@/topic/model/TopicMission';

const MIN_TOPIC_LENGTH = 1;
const MAX_TOPIC_LENGTH = 200;

export interface TopicValidationError {
  message: string;
}

export function validateTopic(topic: string): TopicValidationError | null {
  const trimmed = topic.trim();
  if (trimmed.length < MIN_TOPIC_LENGTH) {
    return { message: '발표 주제를 입력해주세요.' };
  }
  if (trimmed.length > MAX_TOPIC_LENGTH) {
    return { message: `발표 주제는 ${MAX_TOPIC_LENGTH}자 이내로 입력해주세요.` };
  }
  return null;
}

interface UseTopicRegistrationProps {
  boardId: string;
  userId: string | undefined;
}

interface UseTopicRegistrationResult {
  existingMission: TopicMission | null | undefined;
  isLoadingMission: boolean;
  register: (topic: string) => void;
  isPending: boolean;
  error: string | null;
  isSuccess: boolean;
  submittedTopic: string | null;
}

export function useTopicRegistration({
  boardId,
  userId,
}: UseTopicRegistrationProps): UseTopicRegistrationResult {
  const queryClient = useQueryClient();

  const { data: existingMission, isLoading: isLoadingMission } = useQuery<TopicMission | null>({
    queryKey: ['topic_missions', 'current_user', boardId, userId],
    queryFn: () => fetchCurrentUserMission(boardId, userId!),
    enabled: Boolean(boardId) && Boolean(userId),
  });

  const {
    mutate,
    isPending,
    error: mutationError,
    isSuccess,
    data: submittedTopic,
  } = useMutation<string, Error, string>({
    mutationFn: async (topic: string) => {
      if (!userId) throw new Error('로그인이 필요합니다.');
      const validation = validateTopic(topic);
      if (validation) throw new Error(validation.message);
      await registerTopic(boardId, topic.trim(), userId);
      return topic.trim();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['topic_missions', 'current_user', boardId, userId],
      });
    },
  });

  return {
    existingMission,
    isLoadingMission,
    register: mutate,
    isPending,
    error: mutationError?.message ?? null,
    isSuccess,
    submittedTopic: submittedTopic ?? null,
  };
}
