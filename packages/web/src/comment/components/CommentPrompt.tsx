import { useActivity } from "@/comment/hooks/useActivity"
import type React from "react"

interface CommentPromptProps {
    postAuthorId: string;
    postAuthorNickname: string | null;
}
const CommentPrompt: React.FC<CommentPromptProps> = ({ postAuthorId, postAuthorNickname }) => {
    const fromDaysAgo = 7;
    const { data: activity, isLoading } = useActivity(postAuthorId, fromDaysAgo);
    const totalActivityCounts = (activity?.commentings || 0) + (activity?.replyings || 0);
    const authorNickname = postAuthorNickname || "작성자";
    const showPrompt = (isLoading == false) && totalActivityCounts > 0;

    return (
        <div className="space-y-2 text-gray-600 dark:text-gray-400">
            {showPrompt ?
                <p className="space-y-1 text-sm">{authorNickname}님은 최근 {fromDaysAgo}일간 나에게 {totalActivityCounts}개의 댓글을 달아주었어요.</p>
                : null
            }
        </div>
    )
}

export default CommentPrompt

