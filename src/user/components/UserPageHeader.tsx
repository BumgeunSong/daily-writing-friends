import { Menu } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { useNavigate } from "react-router-dom"
import { useAuth } from '@/shared/hooks/useAuth'

interface UserPageHeaderProps {
  userId: string
}

export function UserPageHeader({ userId }: UserPageHeaderProps) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const isCurrentUser = currentUser?.uid === userId

  const handleGoToSettings = () => {
    navigate("/user/settings")
  }

  return (
    <>
      {isCurrentUser && (
        <div className="flex justify-end border-b border-border/40 bg-black p-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-white/20"
            aria-label="Go to user settings"
            onClick={handleGoToSettings}
            tabIndex={0}
            style={{ WebkitTapHighlightColor: 'rgba(255,255,255,0.2)' }}
          >
            <Menu className="size-5 text-white" />
          </Button>
        </div>
      )}
    </>
  )
}