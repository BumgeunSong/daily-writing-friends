import type React from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const PostFreewritingIntro: React.FC = () => {
  const navigate = useNavigate()
  const { boardId } = useParams<{ boardId: string }>()
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  const handleStartFreewriting = () => {
    navigate(`/create/${boardId}/free-writing`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4 mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-primary">프리라이팅</h1>
            <p className="text-lg text-muted-foreground max-w-md">머릿속의 편집자를 끄고 5분간 써보기</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-12">
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col p-5 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all"
            >
              <span className="text-3xl mb-3">🔒</span>
              <h3 className="font-semibold text-lg mb-2">비공개 글쓰기</h3>
              <p className="text-sm text-muted-foreground">
                프리라이팅으로 쓴 글은 다른 멤버들에게 보이지 않아요. 하지만 잔디는 심어지고, 본인은 볼 수 있어요.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col p-5 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all"
            >
              <span className="text-3xl mb-3">🏃</span>
              <h3 className="font-semibold text-lg mb-2">판단하지 않고 쓰기</h3>
              <p className="text-sm text-muted-foreground">
                멈추거나 지우지 마세요. 머릿속에 떠오르는 생각을 그대로 필터없이 씁니다. 내 글을 판단하지 않는 게
                프리라이팅의 핵심이에요.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col p-5 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all"
            >
              <span className="text-3xl mb-3">⏰</span>
              <h3 className="font-semibold text-lg mb-2">5분을 채워보세요</h3>
              <p className="text-sm text-muted-foreground">
                글을 쓰는 동안 시간이 올라갑니다. 5분을 채워야 업로드할 수 있어요! 중간에 나오면 글은 사라져요.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className={cn(
        "sticky bottom-0 left-0 right-0 bg-background border-t p-4 z-10",
        isIOS && "pb-6"
      )}>
        <div className="container mx-auto max-w-3xl">
          <Button
            className="w-full md:w-auto md:px-12 text-lg py-6 rounded-xl shadow-sm hover:shadow-md transition-all"
            onClick={handleStartFreewriting}
          >
            시작하기
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PostFreewritingIntro
