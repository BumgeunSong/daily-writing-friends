import { Menu } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface UserPageHeaderProps {
  isMyPage: boolean
}

export function UserPageHeader({ isMyPage }: UserPageHeaderProps) {
  const navigate = useNavigate()

  const handleGoToSettings = () => {
    navigate("/user/settings")
  }

  if (!isMyPage) {
    return null
  }

  return (
    <header className="bg-background py-3">
      <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
        <div className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px]">
          <span className="text-xl font-semibold tracking-tight md:text-2xl text-foreground">내 프로필</span>
        </div>
        <button
          onClick={handleGoToSettings}
          className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px] reading-hover reading-focus text-foreground transition-all duration-200 active:scale-[0.99]"
          aria-label="Go to user settings"
        >
          <Menu className="size-4 md:size-5" />
        </button>
      </div>
    </header>
  )
}