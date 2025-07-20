import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from '@/shared/hooks/useAuth';
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext";
import { fetchPostingData } from "@/shared/utils/postingUtils";
import { fetchStreakInfo } from "@/stats/api/streakInfo";

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

  const {
    data: streakInfo,
    isLoading: isStreakLoading,
    error: streakError,
  } = useQuery({
    queryKey: ["streakInfo", userId],
    queryFn: () => (userId ? fetchStreakInfo(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - fresh data for completion message
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const { streak, boardPostCount } = useMemo(() => {
    if (!postings || !activeBoardId) return { streak: 0, boardPostCount: 0 };
    
    // Use server-side streak calculation, defaulting to 0 if not available
    const currentStreak = streakInfo?.currentStreak || 0;
    
    const boardPostCount = postings.filter(
      (p) => p.board?.id === activeBoardId
    ).length;
    
    return { streak: currentStreak, boardPostCount };
  }, [postings, activeBoardId, streakInfo]);

  let titleMessage = "";
  let contentMessage = "";
  let highlight: CompletionHighlight = { keywords: [], color: "" };
  let iconType: "trophy" | "sparkles" = "trophy";

  const streakToBe = streak + 1
  const streakMessages = {
    2: "이틀 연속! 내일도 함께 써봐요.",
    3: "와! 벌써 3일 연속이네요. 대단해요!",
    default: "꾸준하게 글쓰는 모습 멋있어요!"
  } as const;

  if (streakToBe >= 1) {
    titleMessage = `연속 글쓰기 ${streakToBe}일`;
    contentMessage = streakMessages[streakToBe as keyof typeof streakMessages] || streakMessages.default;
    highlight = { keywords: [`${streakToBe}일`], color: "yellow" };
    iconType = "trophy";
  } else {
    // 올리고 나면 하나 늘어나므로 +1을 해준다
    const boardPostCountToBe = boardPostCount + 1
    titleMessage = `${boardPostCountToBe}번째 글`;
    contentMessage = `글 정말 재미있어요! 계속 써주세요.`;
    highlight = { keywords: [`${boardPostCountToBe}`], color: "purple" };
    iconType = "sparkles";
  }

  const isLoading = isPostingsLoading || isStreakLoading;

  return {
    titleMessage,
    contentMessage,
    highlight,
    iconType,
    isLoading,
    error: postingsError || streakError,
  };
} 