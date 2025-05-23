import { useRef, useState, useEffect } from "react"
import type { User } from "@/user/model/User"
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/shared/utils/cn"

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

  if (!users || users.length === 0) return null

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return

    const scrollAmount = 200
    const currentScroll = scrollContainerRef.current.scrollLeft

    scrollContainerRef.current.scrollTo({
      left: direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* Left gradient */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      )}

      {/* Right gradient */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      )}

      {/* Left scroll button - only shown when can scroll left */}
      {canScrollLeft && (
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-background/70 backdrop-blur-sm rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Right scroll button - only shown when can scroll right */}
      {canScrollRight && (
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-background/70 backdrop-blur-sm rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="flex py-2 px-6 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {users.map((user) => (
          <div key={user.uid} className="flex flex-col items-center min-w-[72px] max-w-[80px]">
            <Avatar className="w-12 h-12 mb-1.5">
              {user.profilePhotoURL ? (
                <AvatarImage src={user.profilePhotoURL || "/placeholder.svg"} alt={user.nickname ?? "user"} />
              ) : (
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {user.nickname?.[0] ?? "?"}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-xs text-center truncate w-full font-medium">{user.nickname || "익명"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
