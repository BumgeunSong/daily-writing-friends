import type React from "react"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2 } from "lucide-react"

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
        <div className="p-4 overflow-y-auto">
          {users.map((user) => (
            <div key={user.userId} className="flex items-center gap-3 py-3 border-b last:border-0">
              <Avatar className="size-9 border border-border/30">
                <AvatarImage src={user.userProfileImage} alt={user.userName} />
                <AvatarFallback>{user.userName[0]}</AvatarFallback>
              </Avatar>
              <span className="font-medium flex-1">{user.userName}</span>
              {user.userId === currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

