"use client"

import { Loader2, SmilePlus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/shared/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import PresetEmojiPicker from "./PresetEmojiPicker"
import type React from "react"

const EMOJI_PRESET = [
  "😍", // Smiling Face with Heart-Eyes
  "🥰", // Smiling Face with Hearts
  "🥹", // Face Holding Back Tears
  "🤣", // Rolling on the Floor Laughing
  "😊", // Smiling Face with Smiling Eyes
  "🙏", // Folded Hands
  "🔥", // Fire
  "😭", // Loudly Crying Face
  "👏", // Clapping Hands
  "👍", // Thumbs Up
  "💪", // Fist Bump
  "💯", // Hundred Points
]

interface ReactWithEmojiProps {
  onCreate: (emoji: string) => Promise<void>
  disabled?: boolean
}

const ReactWithEmoji: React.FC<ReactWithEmojiProps> = ({ onCreate, disabled = false }) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEmojiClick = async (emoji: string) => {
    try {
      setLoading(true)
      await onCreate(emoji)
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
          className="size-9 rounded-full border border-border bg-background p-0 hover:bg-muted"
          disabled={disabled || loading}
          data-testid="reaction-button"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <SmilePlus className="size-3.5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" sideOffset={5}>
        <PresetEmojiPicker
          emojis={EMOJI_PRESET}
          onSelect={handleEmojiClick}
          loading={loading}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}

export default ReactWithEmoji

