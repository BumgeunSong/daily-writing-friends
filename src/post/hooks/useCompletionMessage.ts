import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext";
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchPostingData } from "@/stats/api/stats";
import { countBoardPosts, getTitleMessage, getContentMessage, getHighlight } from "@/post/utils/completionMessageUtils";

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

export function useCompletionMessage(contentLength: number): CompletionMessageResult {
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

  const boardPostCount = useMemo(() => {
    if (!postings || !activeBoardId) return 1;
    return Math.max(countBoardPosts(postings, activeBoardId), 1);
  }, [postings, activeBoardId]);

  const titleMessage = getTitleMessage(boardPostCount);
  const contentMessage = getContentMessage(contentLength);
  const highlight = getHighlight(boardPostCount);
  const iconType: "trophy" | "sparkles" = "sparkles";

  return {
    titleMessage,
    contentMessage,
    highlight,
    iconType,
    isLoading: isPostingsLoading,
    error: postingsError,
  };
} 