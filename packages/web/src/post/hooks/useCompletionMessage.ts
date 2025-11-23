import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext";
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchPostingData } from "@/shared/utils/postingUtils";

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
  const titleMessage = `${boardPostCountToBe}번째 글 작성 완료`;

  const contentMessage = contentLength >= 250
    ? "글 정말 재미있어요! 계속 써주세요."
    : "짧아도 괜찮아요! 매일 리듬을 만들어나가다보면 좋은 글은 알아서 나와요.";

  const highlight: CompletionHighlight = { keywords: [`${boardPostCountToBe}번째`], color: "purple" };
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