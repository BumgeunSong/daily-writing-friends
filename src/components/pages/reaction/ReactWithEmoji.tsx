"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Picker from "@emoji-mart/react"
import data from "@emoji-mart/data"
import { Loader2, SmilePlus } from "lucide-react"

interface ReactWithEmojiProps {
  onCreate: (emoji: string) => Promise<void>
  disabled?: boolean
}

const ReactWithEmoji: React.FC<ReactWithEmojiProps> = ({ onCreate, disabled = false }) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEmojiSelect = async (emoji: any) => {
    try {
      setLoading(true)
      // emoji-mart는 다른 형식의 데이터를 반환합니다
      await onCreate(emoji.native)
      setOpen(false)
    } catch (error) {
      console.error("이모지 반응 생성 중 오류 발생:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full h-7 w-7 p-0 border border-border bg-background hover:bg-muted"
          disabled={disabled || loading}
          data-testid="reaction-button"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SmilePlus className="h-3.5 w-3.5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" sideOffset={5}>
        <div data-testid="emoji-picker">
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            locale="ko"
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
            navPosition="bottom"
            perLine={8}
            maxFrequentRows={1}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ReactWithEmoji

