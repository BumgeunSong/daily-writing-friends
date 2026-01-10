import { motion } from "framer-motion"
import { CheckCircle, Sparkles, Trophy } from "lucide-react"
import { useState, useEffect } from "react"
import { ConfettiEffect } from "@/shared/components/ConfettiEffect"
import { Button } from "@/shared/ui/button"
import { PostCreationLoading } from "./PostCreationLoading"
import type { CompletionHighlight } from "@/post/hooks/useCompletionMessage"
// 타입 선언: 추상적인 것부터
export interface PostCompletionPageProps {
    titleMessage: string
    contentMessage: string
    highlight: CompletionHighlight
    iconType: "trophy" | "sparkles"
    isLoading: boolean
    onConfirm: () => void
}

export function PostCompletionContent({
    titleMessage,
    contentMessage,
    highlight,
    iconType,
    isLoading,
    onConfirm,
}: PostCompletionPageProps) {
    const [isClient, setIsClient] = useState(false)
    const [showLoading, setShowLoading] = useState(true)

    useEffect(() => {
        setIsClient(true)
    }, [])

    // 최소 1초 로딩 보장
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null
        if (!isLoading) {
            timer = setTimeout(() => {
                setShowLoading(false)
                // 로딩이 끝난 후 햅틱 피드백
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 200])
                }
            }, 1000)
        } else {
            setShowLoading(true)
        }
        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [isLoading])

    if (!isClient) return null // Prevent hydration errors

    if (showLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <PostCreationLoading />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <ConfettiEffect />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex max-w-md flex-col items-center text-center"
            >
                <CelebrationIcon iconType={iconType} color={highlight.color} />

                <CelebrationMessage
                    titleMessage={titleMessage}
                    contentMessage={contentMessage}
                    highlight={highlight}
                />

                <ConfirmButton onConfirm={onConfirm} />
            </motion.div>
        </div>
    )
}

interface ConfirmButtonProps {
    onConfirm: () => void
}

// 컴포넌트 선언: 구체적인 것
export function CelebrationIcon({ iconType, color }: CelebrationIconProps) {
    // Map color string to Tailwind color class
    const colorClass =
        color === "yellow" ? "text-yellow-500" : color === "purple" ? "text-purple-500" : `text-${color}-500`

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1, scale: [1, 1.1, 1] }}
            transition={{
                delay: 0.3,
                duration: 0.5,
                scale: {
                    delay: 0.8,
                    duration: 0.5,
                    repeat: 1,
                    repeatType: "reverse",
                },
            }}
            className="mb-6"
        >
            {iconType === "trophy" ? (
                <Trophy className={`size-16 ${colorClass} mb-2`} />
            ) : (
                <Sparkles className={`size-16 ${colorClass} mb-2`} />
            )}
        </motion.div>
    )
}

interface CelebrationMessageProps {
    titleMessage: string
    contentMessage: string
    highlight: CompletionHighlight
}

function highlightMessageParts(message: string, highlight: CompletionHighlight) {
    if (!highlight.keywords.length) return [message]
    // 여러 키워드가 있을 때, 중복/포함관계 방지 위해 길이순 정렬
    const sortedKeywords = [...highlight.keywords].sort((a, b) => b.length - a.length)
    // 정규식 패턴 생성 (키워드 모두 OR)
    const pattern = new RegExp(`(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g")
    const parts = message.split(pattern)
    return parts.map((part, i) =>
        sortedKeywords.includes(part) ? (
            // eslint-disable-next-line tailwindcss/no-custom-classname -- dynamic color class
            <span key={i} className={`text- font-bold${highlight.color}-500`}>{part}</span>
        ) : (
            <span key={i}>{part}</span>
        )
    )
}

export function CelebrationMessage({
    titleMessage,
    contentMessage,
    highlight,
}: CelebrationMessageProps) {
    return (
        <>
            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mb-3 text-3xl font-bold text-foreground"
            >
                {titleMessage}
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="mb-8 text-xl text-foreground"
            >
                {highlightMessageParts(contentMessage, highlight)}
            </motion.p>
        </>
    )
}

interface CelebrationIconProps {
    iconType: "trophy" | "sparkles"
    color: string
}

export function ConfirmButton({ onConfirm }: ConfirmButtonProps) {
    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="w-full"
        >
            <Button variant="default" onClick={onConfirm} className="w-full py-6 text-lg">
                <CheckCircle className="mr-2 size-5" />
                다른 글 보러 가기
            </Button>
        </motion.div>
    )
}
