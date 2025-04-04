export interface ReactionUser {
  userId: string;
  userName: string;
  userProfileImage: string;
}

export interface Reaction {
  content: string; // 이모지
  by: ReactionUser[];
}

interface UseReactionsProps {
  entityType: "comment" | "reply";
  entityId: string;
}

interface UseReactionsReturn {
  reactions: Reaction[];
  createReaction: (emoji: string) => Promise<void>;
  deleteReaction: (emoji: string, userId: string) => Promise<void>;
}

// 실제 구현은 나중에 할 예정입니다.
export const useReactions = ({ entityType, entityId }: UseReactionsProps): UseReactionsReturn => {
  // 임시 구현
  return {
    reactions: [],
    createReaction: async () => {},
    deleteReaction: async () => {}
  };
}; 