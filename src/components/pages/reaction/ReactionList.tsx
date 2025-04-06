import React, { Suspense } from "react";
import ReactWithEmoji from "@/components/pages/reaction/ReactWithEmoji";
import EmojiReaction from "@/components/pages/reaction/EmojiReaction";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useReactions } from "@/hooks/useReactions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ReactionListProps {
  entityType: "comment" | "reply";
  entityId: string;
}

// 실제 반응 데이터를 표시하는 컴포넌트
const ReactionContent: React.FC<ReactionListProps> = ({ entityType, entityId }) => {
  const { currentUser } = useAuth();
  const { 
    reactions, 
    isLoading, 
    isError,  
    createReaction, 
    deleteReaction 
  } = useReactions({ 
    entityType, 
    entityId 
  });

  // 로그인하지 않은 경우 반응 버튼만 표시
  if (!currentUser) {
    return null;
  }

  // 로딩 중인 경우
  if (isLoading) {
    return <ReactionFallback />;
  }

  // 오류가 발생한 경우
  if (isError) {
    return null;
  }
  
  return (
    <>
      <ReactWithEmoji onCreate={createReaction} />
      
      <div className="flex flex-wrap gap-1">
        {reactions.map((reaction) => (
          <EmojiReaction
            key={reaction.content}
            content={reaction.content}
            count={reaction.by.length}
            users={reaction.by}
            currentUserId={currentUser.uid}
            onDelete={deleteReaction}
          />
        ))}
      </div>
    </>
  );
};

// 로딩 상태를 표시하는 컴포넌트
const ReactionFallback: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-16" />
      <div className="flex gap-1">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
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