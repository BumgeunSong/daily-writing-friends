import React from "react"

interface PresetEmojiPickerProps {
  emojis: string[]
  onSelect: (emoji: string) => void
  loading?: boolean
  disabled?: boolean
  className?: string
}

// 한 줄에 최대 6개씩 배치
const getGridCols = (count: number) => {
  if (count <= 3) return "grid-cols-" + count
  if (count < 6) return "grid-cols-" + count
  return "grid-cols-6"
}

const PresetEmojiPicker: React.FC<PresetEmojiPickerProps> = ({
  emojis,
  onSelect,
  loading = false,
  disabled = false,
  className = "",
}) => {
  const gridCols = getGridCols(emojis.length)

  return (
    <div
      className={`grid ${gridCols} gap-2 sm:${gridCols} ${className}`.trim()}
      data-testid="emoji-picker"
    >
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-2xl transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary active:bg-accent"
          aria-label={emoji}
          disabled={loading || disabled}
          tabIndex={0}
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

export default PresetEmojiPicker 