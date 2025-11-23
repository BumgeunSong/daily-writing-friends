import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from '@/shared/ui/button'
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { cn } from "@/shared/utils/cn"
import type React from "react"

const PostFreewritingTutorial: React.FC = () => {
  const navigate = useNavigate()
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  useEffect(() => {
    sendAnalyticsEvent(AnalyticsEvent.VIEW_FREE_WRITING_TUTORIAL)
  }, [])

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container mx-auto grow px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 space-y-4">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">프리라이팅</h1>
            <p className="max-w-md text-lg text-muted-foreground">머릿속의 편집자를 끄고 5분간 써보기</p>
          </div>

          <div className="mb-12 grid gap-4 md:grid-cols-3">
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <span className="mb-3 text-3xl">🔒</span>
              <h3 className="mb-2 text-lg font-semibold">비공개 글쓰기</h3>
              <p className="text-sm text-muted-foreground">
                프리라이팅으로 쓴 글은 다른 멤버들에게 보이지 않아요. 하지만 잔디는 심어지고, 본인은 볼 수 있어요.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <span className="mb-3 text-3xl">🏃</span>
              <h3 className="mb-2 text-lg font-semibold">판단하지 않고 쓰기</h3>
              <p className="text-sm text-muted-foreground">
                멈추거나 지우지 마세요. 머릿속에 떠오르는 생각을 그대로 필터없이 씁니다. 내 글을 판단하지 않는 게
                프리라이팅의 핵심이에요.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <span className="mb-3 text-3xl">⏰</span>
              <h3 className="mb-2 text-lg font-semibold">5분을 채워보세요</h3>
              <p className="text-sm text-muted-foreground">
                글을 쓰는 동안 시간이 올라갑니다. 5분을 채워야 업로드할 수 있어요! 중간에 나오면 글은 사라져요.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className={cn(
        "sticky bottom-0 left-0 right-0 bg-background border-t p-4 z-10",
        isIOS && "pb-6"
      )}>
        <div className="container mx-auto max-w-3xl">
          <Button
            variant="default"
            className="w-full py-6 text-lg md:w-auto md:px-12"
            onClick={handleGoBack}
          >
            <ArrowLeft className="ml-2 size-5" />
            돌아가기
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PostFreewritingTutorial
