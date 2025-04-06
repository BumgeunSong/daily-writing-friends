"use client"

import type React from "react"
import { Suspense } from "react"
import ReactWithEmoji from "@/components/pages/reaction/ReactWithEmoji"
import EmojiReaction from "@/components/pages/reaction/EmojiReaction"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { CommentParams, ReplyParams, useReactions } from "@/hooks/useReactions"

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
    <div className="flex flex-wrap gap-1.5 max-w-full overflow-hidden">
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
      <Skeleton className="h-7 w-7 rounded-full" />
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
    <div className="mt-2 mb-3">
      <Suspense fallback={<ReactionFallback />}>
        <ReactionContent entity={entity} />
      </Suspense>
    </div>
  )
}

export default ReactionList

