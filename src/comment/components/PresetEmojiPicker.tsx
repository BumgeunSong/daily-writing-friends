import type React from "react"

interface PresetEmojiPickerProps {
  emojis: string[]
  onSelect: (emoji: string) => void
  loading?: boolean
  disabled?: boolean
  className?: string
}

// 한 줄에 최대 6개씩 배치
const gridColsMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
}

const getGridCols = (count: number) => {
  if (count <= 6) return gridColsMap[count] ?? "grid-cols-6"
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