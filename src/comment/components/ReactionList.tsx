import { Suspense } from "react"
import EmojiReaction from "@/comment/components/EmojiReaction"
import ReactWithEmoji from "@/comment/components/ReactWithEmoji"
import { CommentParams, ReplyParams, useReactions } from "@/comment/hooks/useReactions"
import { useAuth } from "@shared/hooks/useAuth"
import { Skeleton } from "@shared/ui/skeleton"
import type React from "react"

interface ReactionListProps {
  entity: CommentParams | ReplyParams
}

// 실제 반응 데이터를 표시하는 컴포넌트
const ReactionContent: React.FC<ReactionListProps> = ({ entity }) => {
  const { currentUser } = useAuth()
  const { reactions, isLoading, isError, createReaction, deleteReaction } = useReactions({ entity })

  // 로그인하지 않은 경우 반응 버튼만 표시
  if (!currentUser) {
    return null
  }

  // 로딩 중인 경우
  if (isLoading) {
    return <ReactionFallback />
  }

  // 오류가 발생한 경우
  if (isError) {
    return null
  }

  return (
    <div className="flex max-w-full flex-wrap gap-1.5 overflow-hidden">
      <ReactWithEmoji onCreate={createReaction} />
      
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
  )
}

// 로딩 상태를 표시하는 컴포넌트
const ReactionFallback: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-7 rounded-full" />
      <div className="flex gap-1.5">
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-12 rounded-full" />
      </div>
    </div>
  )
}

// 메인 ReactionList 컴포넌트
const ReactionList: React.FC<ReactionListProps> = ({ entity }) => {
  return (
    <div className="mb-3 mt-2">
      <Suspense fallback={<ReactionFallback />}>
        <ReactionContent entity={entity} />
      </Suspense>
    </div>
  )
}

export default ReactionList

