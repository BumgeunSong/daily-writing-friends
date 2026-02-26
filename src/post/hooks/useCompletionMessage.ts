import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext";
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchPostingData } from "@/stats/api/stats";
import { getTitleMessage, getContentMessage, getHighlight } from "@/post/utils/completionMessageUtils";

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
    if (!postings || !activeBoardId) return 0;

    return postings.filter(
      (p) => p.board?.id === activeBoardId
    ).length;
  }, [postings, activeBoardId]);

  const boardPostCountToBe = boardPostCount + 1;
  const titleMessage = getTitleMessage(boardPostCountToBe);
  const contentMessage = getContentMessage(contentLength);
  const highlight = getHighlight(boardPostCountToBe);
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