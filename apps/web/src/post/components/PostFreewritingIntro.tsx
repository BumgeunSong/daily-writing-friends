import { ArrowRight, Info } from "lucide-react"
import { useEffect, useState, type ChangeEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"

import {
  countNonWhitespaceCharacters,
  isWithinCharacterLimit,
  truncateToNonWhitespaceLimit
} from "@/post/utils/topicInputUtils"
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { cn } from "@/shared/utils/cn"
import type React from "react"

const MAX_TOPIC_LENGTH = 50
const DEFAULT_TARGET_TIME_IN_SECONDS = 10 * 60
const TARGET_TIME_OPTIONS_IN_MINUTES = [5, 10, 20] as const

const PostFreewritingIntro: React.FC = () => {
  const navigate = useNavigate()
  const { boardId } = useParams<{ boardId: string }>()
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  const [selectedTargetTimeInSeconds, setSelectedTargetTimeInSeconds] = useState(DEFAULT_TARGET_TIME_IN_SECONDS)
  const [topic, setTopic] = useState("")

  useEffect(() => {
    sendAnalyticsEvent(AnalyticsEvent.START_FREE_WRITING, { boardId })
  }, [boardId])

  const handleTopicChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value

    if (isWithinCharacterLimit(inputValue, MAX_TOPIC_LENGTH)) {
      setTopic(inputValue)
    } else {
      const truncatedTopic = truncateToNonWhitespaceLimit(inputValue, MAX_TOPIC_LENGTH)
      setTopic(truncatedTopic)
    }
  }

  const navigateToFreewritingPage = () => {
    const trimmedTopic = topic.trim()
    const topicToPass = trimmedTopic || undefined

    navigate(`/create/${boardId}/free-writing`, {
      state: {
        targetTime: selectedTargetTimeInSeconds,
        topic: topicToPass
      }
    })
  }

  const navigateToTutorialPage = () => {
    navigate('/free-writing/tutorial')
  }

  const createTimeButtonClickHandler = (timeInMinutes: number) => {
    const timeInSeconds = timeInMinutes * 60
    setSelectedTargetTimeInSeconds(timeInSeconds)
  }

  const isTimeOptionSelected = (timeInMinutes: number): boolean => {
    const timeInSeconds = timeInMinutes * 60
    return selectedTargetTimeInSeconds === timeInSeconds
  }

  const currentNonWhitespaceCharacterCount = countNonWhitespaceCharacters(topic)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container mx-auto grow px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 space-y-4">
            <h1 className="text-3xl font-bold text-foreground">프리라이팅 시작하기</h1>
            <Button
              variant="link"
              onClick={navigateToTutorialPage}
              className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
            >
              프리라이팅이 무엇인가요?
              <Info className="size-4" />
            </Button>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <Label className="text-base font-semibold">목표 시간</Label>
              <div className="flex gap-3">
                {TARGET_TIME_OPTIONS_IN_MINUTES.map((timeInMinutes) => (
                  <Button
                    key={timeInMinutes}
                    variant={isTimeOptionSelected(timeInMinutes) ? "default" : "outline"}
                    onClick={() => createTimeButtonClickHandler(timeInMinutes)}
                    className={cn(
                      "flex-1 h-12",
                      isTimeOptionSelected(timeInMinutes) && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    {timeInMinutes}분
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-base font-semibold">
                  프리라이팅 주제
                </Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={handleTopicChange}
                  placeholder="요즘 내가 자주 생각하는 사람, 공간, 감정, 대상, 사건 하나를 골라주세요. 그 주제에서부터 프리라이팅을 시작하면 효과적입니다."
                  className="min-h-[4.5rem] resize-none"
                  rows={3}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {currentNonWhitespaceCharacterCount}/{MAX_TOPIC_LENGTH}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "sticky bottom-0 left-0 right-0 bg-background border-t p-4 z-10",
        isIOS && "pb-6"
      )}>
        <div className="container mx-auto max-w-2xl">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="py-6 text-lg"
              onClick={() => navigate(-1)}
            >
              돌아가기
            </Button>
            <Button
              variant="default"
              className="flex-1 py-6 text-lg"
              onClick={navigateToFreewritingPage}
            >
              시작하기
              <ArrowRight className="ml-2 size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostFreewritingIntro
