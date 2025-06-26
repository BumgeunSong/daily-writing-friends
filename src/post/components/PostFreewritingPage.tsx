import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { PostVisibility } from '@/post/model/Post'
import { createPost } from '@/post/utils/postUtils'
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext"
import { useAuth } from '@/shared/hooks/useAuth'
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { WritingStatus } from "@/stats/model/WritingStatus"
import { useUserNickname } from '@/user/hooks/useUserNickname'
import CountupWritingTimer from "./CountupWritingTimer"
import { PostSubmitButton } from "./PostSubmitButton"
import { PostTextEditor } from "./PostTextEditor"
import type React from "react"

export default function PostFreewritingPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const { boardId } = useParams<{ boardId: string }>()
  const { nickname: userNickname } = useUserNickname(currentUser?.uid);
  const { value: freeWritingTargetTime } = useRemoteConfig('free_writing_target_time')

  // 상태 관리
  const POST_TITLE = userNickname ? `${userNickname}님의 프리라이팅` : "프리라이팅"
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timerStatus, setTimerStatus] = useState<WritingStatus>(WritingStatus.Paused)
  const [isReached, setIsReached] = useState(false)

  // 타이핑 감지를 위한 타임아웃 ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 타이머 목표 시간 도달 처리
  const handleTimerReach = useCallback(() => {
    setIsReached(true)
    toast.success("목표 시간을 달성했습니다. 이제 글을 업로드할 수 있어요.", {position: 'bottom-center'})
  }, [toast])

  // 텍스트 변경 시 타이핑 감지
  const handleContentChange = (newContent: string) => {
    setContent(newContent)

    // 타이핑 중이면 WritingStatus를 Writing으로 설정
    setTimerStatus(WritingStatus.Writing)

    // 이전 타임아웃이 있으면 제거
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // 2초 동안 타이핑이 없으면 Paused로 설정
    typingTimeoutRef.current = setTimeout(() => {
      setTimerStatus(WritingStatus.Paused)
    }, 2000)
  }

  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // 게시물 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser || !boardId) return

    if (!POST_TITLE.trim() || !content.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.", {position: 'bottom-center'})
      return
    }

    setIsSubmitting(true)

    try {
      await createPost(boardId, POST_TITLE, content, currentUser.uid, userNickname ?? '', PostVisibility.PRIVATE)

      toast.success("프리라이팅으로 쓴 글은 다른 사람에게 보이지 않아요.", {position: 'bottom-center'})

      sendAnalyticsEvent(AnalyticsEvent.FINISH_FREE_WRITING, { boardId })

      navigate(`/boards/${boardId}`)
    } catch (error) {
      console.error("게시 중 오류:", error)
      toast.error("글을 업로드하는 중 오류가 발생했습니다. 다시 시도해주세요.", {position: 'bottom-center'})
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 카운트업 타이머 */}
      <CountupWritingTimer
        status={timerStatus}
        reached={isReached}
        onReach={handleTimerReach}
        targetTime={freeWritingTargetTime}
      />

      <div className="container mx-auto max-w-3xl grow px-4 py-6 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="overflow-hidden rounded-xl border bg-card">
            <PostTextEditor value={content} onChange={handleContentChange} />
          </div>

          <div className="flex items-center justify-end pt-2">
            <PostSubmitButton
              isSubmitting={isSubmitting}
              disabled={!isReached || !POST_TITLE.trim() || !content.trim()}
              label={isReached ? "업로드하기" : "아직 시간이 남았어요"}
              submittingLabel="업로드 중..."
              className="px-8 py-6 text-lg"
            />
          </div>
        </form>
      </div>
    </div>
  )
}
