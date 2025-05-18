import { Menu } from "lucide-react"
import { Button } from "@/shared/ui/button"

interface UserSettingButtonProps {
  onClick: () => void
}

export function UserPageHeader({ onClick }: UserSettingButtonProps) {
  return (
    <div className="flex justify-end border-b border-border/40 bg-black p-2">
      <Button
        variant="ghost"
        size="icon"
        className="size-9 text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-white/20"
        aria-label="Go to user settings"
        onClick={onClick}
        tabIndex={0}
        style={{ WebkitTapHighlightColor: 'rgba(255,255,255,0.2)' }}
      >
        <Menu className="size-5 text-white" />
      </Button>
    </div>
  )
}