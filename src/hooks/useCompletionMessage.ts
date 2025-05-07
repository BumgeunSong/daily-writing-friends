import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { fetchPostingData } from "@/utils/postingUtils";
import { calculateCurrentStreak } from "@/utils/streakUtils";
import { useMemo } from "react";

export function useCompletionMessage() {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const {
    value: activeBoardId,
    isLoading: isConfigLoading,
    error: configError,
  } = useRemoteConfig<string>("active_board_id", "");

  const {
    data: postings,
    isLoading: isPostingsLoading,
    error: postingsError,
  } = useQuery({
    queryKey: ["userPostings", userId],
    queryFn: () => (userId ? fetchPostingData(userId) : Promise.resolve([])),
    enabled: !!userId,
  });

  const { streak, boardPostCount } = useMemo(() => {
    if (!postings || !activeBoardId) return { streak: 0, boardPostCount: 0 };
    const streak = calculateCurrentStreak(postings);
    const boardPostCount = postings.filter(
      (p) => p.board?.id === activeBoardId
    ).length;
    return { streak, boardPostCount };
  }, [postings, activeBoardId]);

  let titleMessage = "";
  let contentMessage = "";
  if (streak > 3) {
    titleMessage = "훌륭합니다!";
    contentMessage = `연속 글쓰기 ${streak}일을 달성했어요`;
  } else {
    titleMessage = "훌륭합니다.";
    contentMessage = `이번 기수에 ${boardPostCount}개의 글을 썼어요`;
  }

  const isLoading = isConfigLoading || isPostingsLoading;

  return {
    titleMessage,
    contentMessage,
    isLoading,
    error: configError || postingsError,
  };
} 