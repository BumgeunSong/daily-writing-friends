import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { toast } from "sonner"
import { PostVisibility } from '@/post/model/Post'
import { createPost } from '@/post/utils/postUtils'
import { prependTopicToContent } from '@/post/utils/freewritingContentUtils'
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

const DEFAULT_TARGET_TIME_IN_SECONDS = 10 * 60
const TYPING_PAUSE_DELAY_IN_MILLISECONDS = 2000

export default function PostFreewritingPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { boardId } = useParams<{ boardId: string }>()
  const { nickname: userNickname } = useUserNickname(currentUser?.uid);

  const freewritingConfig = (location.state as FreewritingConfig) || {}
  const targetTimeInSeconds = freewritingConfig.targetTime ?? DEFAULT_TARGET_TIME_IN_SECONDS
  const selectedTopic = freewritingConfig.topic

  const postTitle = userNickname ? `${userNickname}님의 프리라이팅` : "프리라이팅"
  const [content, setContent] = useState("")
  const [contentJson, setContentJson] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timerStatus, setTimerStatus] = useState<WritingStatus>(WritingStatus.Paused)
  const [hasReachedTargetTime, setHasReachedTargetTime] = useState(false)

  const typingPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTargetTimeReached = useCallback(() => {
    setHasReachedTargetTime(true)
    toast.success("목표 시간을 달성했습니다. 이제 글을 업로드할 수 있어요.", {position: 'bottom-center'})
  }, [])

  const handleContentChange = (updatedContent: string) => {
    setContent(updatedContent)
    setTimerStatus(WritingStatus.Writing)

    if (typingPauseTimeoutRef.current) {
      clearTimeout(typingPauseTimeoutRef.current)
    }

    typingPauseTimeoutRef.current = setTimeout(() => {
      setTimerStatus(WritingStatus.Paused)
    }, TYPING_PAUSE_DELAY_IN_MILLISECONDS)
  }

  useEffect(() => {
    return () => {
      if (typingPauseTimeoutRef.current) {
        clearTimeout(typingPauseTimeoutRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser || !boardId) return

    const hasTitleAndContent = postTitle.trim() && content.trim()
    if (!hasTitleAndContent) {
      toast.error("제목과 내용을 모두 입력해주세요.", {position: 'bottom-center'})
      return
    }

    setIsSubmitting(true)

    try {
      const contentWithTopic = prependTopicToContent(content, selectedTopic)

      await createPost(
        boardId,
        postTitle,
        contentWithTopic,
        currentUser.uid,
        userNickname ?? '',
        PostVisibility.PRIVATE,
        contentJson
      )

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

  const isUploadButtonDisabled = isSubmitting || !hasReachedTargetTime || !postTitle.trim() || !content.trim()

  if (!currentUser) {
    return <div>Loading user...</div>;
  }

  if (!boardId) {
    return <div>No board ID found</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PostFreewritingHeader
        topic={selectedTopic}
        timerDisplay={
          <CountupWritingTimer
            status={timerStatus}
            reached={hasReachedTargetTime}
            onReach={handleTargetTimeReached}
            targetTime={targetTimeInSeconds}
          />
        }
        rightActions={
          <Button
            variant="default"
            type="submit"
            form="freewriting-form"
            disabled={isUploadButtonDisabled}
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
