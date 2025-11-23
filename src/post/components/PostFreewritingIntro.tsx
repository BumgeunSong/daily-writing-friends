import { ArrowRight, Info } from "lucide-react"
import { useEffect, useState, type ChangeEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { Label } from '@/shared/ui/label'
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { cn } from "@/shared/utils/cn"
import type React from "react"

const MAX_TOPIC_LENGTH = 30

const PostFreewritingIntro: React.FC = () => {
  const navigate = useNavigate()
  const { boardId } = useParams<{ boardId: string }>()
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  const [selectedTargetTime, setSelectedTargetTime] = useState(10 * 60)
  const [topic, setTopic] = useState("")

  useEffect(() => {
    sendAnalyticsEvent(AnalyticsEvent.START_FREE_WRITING, { boardId })
  }, [boardId])

  const handleTopicChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if ([...newValue].length <= MAX_TOPIC_LENGTH) {
      setTopic(newValue)
    }
  }

  const handleStartFreewriting = () => {
    navigate(`/create/${boardId}/free-writing`, {
      state: {
        targetTime: selectedTargetTime,
        topic: topic.trim() || undefined
      }
    })
  }

  const handleViewTutorial = () => {
    navigate('/free-writing/tutorial')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container mx-auto grow px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 space-y-4">
            <h1 className="text-3xl font-bold text-foreground">프리라이팅 시작하기</h1>
            <Button
              variant="link"
              onClick={handleViewTutorial}
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
                {[5, 10, 20].map((minutes) => (
                  <Button
                    key={minutes}
                    variant={selectedTargetTime === minutes * 60 ? "default" : "outline"}
                    onClick={() => setSelectedTargetTime(minutes * 60)}
                    className={cn(
                      "flex-1 h-12",
                      selectedTargetTime === minutes * 60 && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    {minutes}분
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
                  placeholder="요즘 내가 자주 생각하는 사람, 공간, 감정, 대상, 사건 하나를 쓰세요. 그 주제에서부터 프리라이팅을 시작하면 효과적이에요"
                  className="min-h-[4.5rem] resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {[...topic].length}/{MAX_TOPIC_LENGTH}
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
          <Button
            variant="default"
            className="w-full py-6 text-lg"
            onClick={handleStartFreewriting}
          >
            시작하기
            <ArrowRight className="ml-2 size-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PostFreewritingIntro
