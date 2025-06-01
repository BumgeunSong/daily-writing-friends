import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/useAuth";
import { addReplyToComment } from "../utils/commentUtils";
import { useQueryClient } from "@tanstack/react-query";

export function useAddReply(boardId: string, postId: string, commentId: string) {
    const { currentUser } = useAuth();
    const userId = currentUser?.uid;
    const queryClient = useQueryClient();
  
    return useMutation(
      async (content: string) => {
        if (!currentUser) throw new Error('로그인이 필요합니다.');
        return addReplyToComment(
          boardId,
          postId,
          commentId,
          content,
          currentUser.uid,
          currentUser.displayName,
          currentUser.photoURL,
        );
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['replies', boardId, postId, commentId, userId] });
          queryClient.invalidateQueries({ queryKey: ['replyCount', boardId, postId, commentId, userId] });
        },
      }
    );
  } 