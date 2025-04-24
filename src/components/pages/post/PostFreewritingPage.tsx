import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { PostTextEditor } from "./PostTextEditor"
import CountupWritingTimer from "./CountupWritingTimer"
import { WritingStatus } from "@/types/WritingStatus"
import { createPost } from "@/utils/postUtils"
import { useToast } from "@/hooks/use-toast"
import { PostSubmitButton } from "./PostSubmitButton"
import { fetchUserNickname } from "@/utils/userUtils"
import { useQuery } from "@tanstack/react-query"
import { PostVisibility } from "@/types/Post"

// 목표 시간 5 minutes
const TARGET_TIME = 5 * 60

export default function PostFreewritingPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const { boardId } = useParams<{ boardId: string }>()
  const { toast } = useToast()
  const { data: userNickname } = useQuery({
    queryKey: ["userNickname", currentUser?.uid],
    queryFn: () => fetchUserNickname(currentUser?.uid),
  })

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
    toast({
      title: "프리라이팅 성공!",
      description: "목표 시간을 달성했습니다. 이제 글을 업로드할 수 있어요.",
      variant: "default",
    })
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
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await createPost(boardId, POST_TITLE, content, currentUser.uid, userNickname ?? '', PostVisibility.PRIVATE)

      toast({
        title: "업로드 완료",
        description: "프리라이팅으로 쓴 글은 다른 사람에게 보이지 않아요.",
      })

      navigate(`/boards/${boardId}`)
    } catch (error) {
      console.error("게시 중 오류:", error)
      toast({
        title: "업로드 실패",
        description: "글을 업로드하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 카운트업 타이머 */}
      <CountupWritingTimer
        status={timerStatus}
        reached={isReached}
        onReach={handleTimerReach}
        targetTime={TARGET_TIME}
      />

      <div className="flex-grow container mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-xl border overflow-hidden">
            <PostTextEditor value={content} onChange={handleContentChange} />
          </div>

          <div className="flex justify-end items-center pt-2">
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
