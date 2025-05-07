import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CheckCircle, Sparkles, Trophy } from "lucide-react"
import { PostCreationLoading } from "./PostCreationLoading"
import { ConfettiEffect } from "@/components/common/ConfettiEffect"
// 타입 선언: 추상적인 것부터
export interface PostCompletionPageProps {
    titleMessage: string
    contentMessage: string
    highlightValue: number
    highlightUnit: string
    highlightColor: "yellow" | "purple" | string
    iconType: "trophy" | "sparkles"
    isLoading: boolean
    onConfirm: () => void
}

export function PostCompletionContent({
    titleMessage,
    contentMessage,
    highlightValue,
    highlightUnit,
    highlightColor,
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
                <PostCreationLoading />
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
            <ConfettiEffect />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center text-center max-w-md"
            >
                <CelebrationIcon iconType={iconType} color={highlightColor} />

                <CelebrationMessage
                    titleMessage={titleMessage}
                    contentMessage={contentMessage}
                    highlightValue={highlightValue}
                    highlightUnit={highlightUnit}
                    highlightColor={highlightColor}
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
                <Trophy className={`w-16 h-16 ${colorClass} mb-2`} />
            ) : (
                <Sparkles className={`w-16 h-16 ${colorClass} mb-2`} />
            )}
        </motion.div>
    )
}

interface CelebrationMessageProps {
    titleMessage: string
    contentMessage: string
    highlightValue: number
    highlightUnit: string
    highlightColor: string
}

export function CelebrationMessage({
    titleMessage,
    contentMessage,
    highlightValue,
    highlightUnit,
    highlightColor,
}: CelebrationMessageProps) {
    // Map color string to Tailwind color class
    const colorClass =
        highlightColor === "yellow"
            ? "text-yellow-500"
            : highlightColor === "purple"
                ? "text-purple-500"
                : `text-${highlightColor}-500`

    // Split the content message to insert the highlighted value
    const messageParts = contentMessage.split(highlightValue.toString())

    return (
        <>
            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-3xl font-bold mb-3"
            >
                {titleMessage}
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="text-xl mb-8"
            >
                {messageParts[0]}
                <span className={`font-bold ${colorClass}`}>
                    {highlightValue}
                    {highlightUnit}
                </span>
                {messageParts[1]}
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
            <Button onClick={onConfirm} className="w-full py-6 text-lg bg-black hover:bg-gray-800 text-white rounded-full">
                <CheckCircle className="mr-2 h-5 w-5" />
                확인
            </Button>
        </motion.div>
    )
}
