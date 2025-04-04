import React, { Suspense } from "react";
import ReactWithEmoji from "@/components/reaction/ReactWithEmoji";
import EmojiReaction from "@/components/reaction/EmojiReaction";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useReactions } from "@/hooks/useReactions";

interface ReactionListProps {
  entityType: "comment" | "reply";
  entityId: string;
}

// 실제 반응 데이터를 표시하는 컴포넌트
const ReactionContent: React.FC<ReactionListProps> = ({ entityType, entityId }) => {
  const { currentUser } = useAuth();
  const { reactions, createReaction, deleteReaction } = useReactions({ entityType, entityId });

  if (!currentUser) return null;

  return (
    <>
      <ReactWithEmoji onCreate={createReaction} />
      
      {reactions.length > 0 && (
        <div className="flex-1">
          <EmojiReaction
            reactions={reactions}
            onDelete={deleteReaction}
            currentUserId={currentUser.uid}
          />
        </div>
      )}
    </>
  );
};

// 로딩 상태를 표시하는 컴포넌트
const ReactionFallback: React.FC = () => {
  return (
    <>
      <ReactWithEmoji onCreate={() => {}} disabled />
      <div className="flex-1">
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </>
  );
};

// 메인 ReactionList 컴포넌트
const ReactionList: React.FC<ReactionListProps> = ({ entityType, entityId }) => {
  return (
    <div className="flex items-start gap-2 mt-2">
      <Suspense fallback={<ReactionFallback />}>
        <ReactionContent entityType={entityType} entityId={entityId} />
      </Suspense>
    </div>
  );
};

export default ReactionList; 