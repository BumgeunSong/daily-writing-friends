import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from '@/shared/ui/button'
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { cn } from "@/shared/utils/cn"
import {
  FREEWRITING_TUTORIAL_TITLE,
  FREEWRITING_TUTORIAL_SUBTITLE,
  FREEWRITING_TUTORIAL_CARDS,
  type TutorialCard
} from "@/post/data/freewritingTutorialContent"
import type React from "react"

const PostFreewritingTutorial: React.FC = () => {
  const navigate = useNavigate()
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  useEffect(() => {
    sendAnalyticsEvent(AnalyticsEvent.VIEW_FREE_WRITING_TUTORIAL)
  }, [])

  const navigateBack = () => {
    navigate(-1)
  }

  const renderTutorialCard = (card: TutorialCard) => (
    <motion.div
      key={card.title}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
    >
      <span className="mb-3 text-3xl">{card.emoji}</span>
      <h3 className="mb-2 text-lg font-semibold">{card.title}</h3>
      <p className="text-sm text-muted-foreground">{card.description}</p>
    </motion.div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container mx-auto grow px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 space-y-4">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {FREEWRITING_TUTORIAL_TITLE}
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              {FREEWRITING_TUTORIAL_SUBTITLE}
            </p>
          </div>

          <div className="mb-12 flex flex-col gap-4">
            {FREEWRITING_TUTORIAL_CARDS.map(renderTutorialCard)}
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
            onClick={navigateBack}
          >
            <ArrowLeft className="mr-2 size-5" />
            돌아가기
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PostFreewritingTutorial
