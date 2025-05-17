import { Menu } from "lucide-react"
import { Button } from "@/shared/ui/button"

interface UserSettingButtonProps {
  onClick: () => void
}

export function UserPageHeader({ onClick }: UserSettingButtonProps) {
  return (
    <div className="flex justify-end p-2 border-b border-border/40 bg-black">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-white active:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus:outline-none transition"
        aria-label="Go to user settings"
        onClick={onClick}
        tabIndex={0}
        style={{ WebkitTapHighlightColor: 'rgba(255,255,255,0.2)' }}
      >
        <Menu className="h-5 w-5 text-white" />
      </Button>
    </div>
  )
}