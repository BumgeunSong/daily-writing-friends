import { Trash2 } from "lucide-react"
import ComposedAvatar from "@/shared/ui/ComposedAvatar"
import { Button } from "@/shared/ui/button"
import { Drawer, DrawerContent } from "@/shared/ui/drawer"
import type React from "react"

interface ReactionUser {
  userId: string
  userName: string
  userProfileImage: string
}

interface ReactionUserDrawerProps {
  emoji: string
  users: ReactionUser[]
  currentUserId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (emoji: string, userId: string) => void
}

export const ReactionUserDrawer: React.FC<ReactionUserDrawerProps> = ({
  emoji,
  users,
  currentUserId,
  isOpen,
  onOpenChange,
  onDelete,
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto p-4">
          {users.map((user) => (
            <div key={user.userId} className="flex items-center gap-3 border-b py-3 last:border-0">
              <ComposedAvatar
                className="border border-border/30"
                size={36}
                src={user.userProfileImage}
                alt={user.userName}
                fallback={user.userName[0]}
              />
              <span className="flex-1 font-medium">{user.userName}</span>
              {user.userId === currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(emoji, currentUserId)}
                  aria-label="내 반응 삭제"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

