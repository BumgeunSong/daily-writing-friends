import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { UI_CONSTANTS } from "@/login/constants"
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar"
import { cn } from "@/shared/utils/cn"
import type { User } from "@/user/model/User"

interface ActiveUserProfileListProps {
  users: User[]
  className?: string
}

export default function ActiveUserProfileList({ users, className }: ActiveUserProfileListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  
  const checkScrollability = () => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current

    // Can scroll left if scrolled more than 1px from the beginning
    setCanScrollLeft(scrollLeft > 1)

    // Can scroll right if not at the end
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1) // -1 for rounding errors
  }

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    // Check initial scrollability
    checkScrollability()

    // Add scroll event listener
    scrollContainer.addEventListener("scroll", checkScrollability)

    // Add resize event listener to recheck on window resize
    window.addEventListener("resize", checkScrollability)

    return () => {
      scrollContainer.removeEventListener("scroll", checkScrollability)
      window.removeEventListener("resize", checkScrollability)
    }
  }, [])

  // Recheck scrollability when users change
  useEffect(() => {
    checkScrollability()
  }, [users])

  if (users.length === 0) return null

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return

    const currentScroll = scrollContainerRef.current.scrollLeft

    scrollContainerRef.current.scrollTo({
      left: direction === "left" ? currentScroll - UI_CONSTANTS.SCROLL_AMOUNT : currentScroll + UI_CONSTANTS.SCROLL_AMOUNT,
      behavior: "smooth",
    })
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* Left gradient */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
      )}

      {/* Right gradient */}
      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
      )}

      {/* Left scroll button - only shown when can scroll left */}
      {canScrollLeft && (
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/70 p-1 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {/* Right scroll button - only shown when can scroll right */}
      {canScrollRight && (
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/70 p-1 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="scrollbar-hide flex overflow-x-auto px-6 py-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {users.map((user) => (
          <div key={user.uid} className="flex min-w-[72px] max-w-[80px] flex-col items-center">
            <Avatar className="mb-1.5 size-12">
              {user.profilePhotoURL ? (
                <AvatarImage src={user.profilePhotoURL || "/placeholder.svg"} alt={user.nickname ?? "user"} />
              ) : (
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {user.nickname?.[0] ?? "?"}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="w-full truncate text-center text-xs font-medium">{user.nickname || "익명"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
