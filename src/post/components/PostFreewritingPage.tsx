import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { toast } from "sonner"
import { PostVisibility } from '@/post/model/Post'
import { createPost } from '@/post/utils/postUtils'
import { useAuth } from '@/shared/hooks/useAuth'
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { WritingStatus } from "@/stats/model/WritingStatus"
import { useUserNickname } from '@/user/hooks/useUserNickname'
import CountupWritingTimer from "./CountupWritingTimer"
import { PostEditor } from "./PostEditor"
import { PostFreewritingHeader } from "./PostFreewritingHeader"
import { Button } from "@/shared/ui/button"
import { Loader2 } from "lucide-react"
import type React from "react"

interface FreewritingConfig {
  targetTime?: number
  topic?: string
}

export default function PostFreewritingPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { boardId } = useParams<{ boardId: string }>()
  const { nickname: userNickname } = useUserNickname(currentUser?.uid);

  const { targetTime = 10 * 60, topic } = (location.state as FreewritingConfig) || {}

  // 상태 관리
  const POST_TITLE = userNickname ? `${userNickname}님의 프리라이팅` : "프리라이팅"
  const [content, setContent] = useState("")
  const [contentJson, setContentJson] = useState<any>(null)
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
      const contentWithTopic = topic
        ? `>> 프리라이팅 주제: ${topic}\n\n${content}`
        : content

      await createPost(boardId, POST_TITLE, contentWithTopic, currentUser.uid, userNickname ?? '', PostVisibility.PRIVATE, contentJson)

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

  if (!currentUser) {
    return <div>Loading user...</div>;
  }

  if (!boardId) {
    return <div>No board ID found</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PostFreewritingHeader
        topic={topic}
        timerDisplay={
          <CountupWritingTimer
            status={timerStatus}
            reached={isReached}
            onReach={handleTimerReach}
            targetTime={targetTime}
          />
        }
        rightActions={
          <Button
            variant="default"
            type="submit"
            form="freewriting-form"
            disabled={isSubmitting || !isReached || !POST_TITLE.trim() || !content.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              "업로드"
            )}
          </Button>
        }
      />

      <div className="container mx-auto max-w-4xl grow px-6 py-8">
        <form id="freewriting-form" onSubmit={handleSubmit} className="space-y-6">
          <PostEditor
            value={content}
            onChange={handleContentChange}
            contentJson={contentJson}
            onJsonChange={setContentJson}
          />
        </form>
      </div>
    </div>
  )
}
