import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from '@/shared/hooks/useAuth';
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext";
import { fetchPostingData } from "@/shared/utils/postingUtils";
import { calculateCurrentStreak } from "@/stats/utils/streakUtils";

export interface CompletionHighlight {
  keywords: string[];
  color: string;
}

export interface CompletionMessageResult {
  titleMessage: string;
  contentMessage: string;
  highlight: CompletionHighlight;
  iconType: "trophy" | "sparkles";
  isLoading: boolean;
  error?: unknown;
}

export function useCompletionMessage(): CompletionMessageResult {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const { value: activeBoardId } = useRemoteConfig("active_board_id");

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
  let highlight: CompletionHighlight = { keywords: [], color: "" };
  let iconType: "trophy" | "sparkles" = "trophy";

  if (streak > 3) {
    titleMessage = `연속 글쓰기 ${streak}일`;
    contentMessage = `꾸준하게 글쓰는 모습 멋있어요!`;
    highlight = { keywords: [`${streak}일`], color: "yellow" };
    iconType = "trophy";
  } else {
    // 올리고 나면 하나 늘어나므로 +1을 해준다
    const boardPostCountToBe = boardPostCount + 1
    titleMessage = `${boardPostCountToBe}번째 글`;
    contentMessage = `글 정말 재미있어요! 계속 써주세요.`;
    highlight = { keywords: [`${boardPostCountToBe}`], color: "purple" };
    iconType = "sparkles";
  }

  const isLoading = isPostingsLoading;

  return {
    titleMessage,
    contentMessage,
    highlight,
    iconType,
    isLoading,
    error: postingsError,
  };
} 