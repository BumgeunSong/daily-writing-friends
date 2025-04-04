import React from "react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";

interface ReactionUser {
  userId: string;
  userName: string;
  userProfileImage: string;
}

interface ReactionDrawerProps {
  emoji: string;
  users: ReactionUser[];
  currentUserId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (emoji: string, userId: string) => void;
}

export const ReactionDrawer: React.FC<ReactionDrawerProps> = ({
  emoji,
  users,
  currentUserId,
  isOpen,
  onOpenChange,
  onDelete
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-center">
              <span className="text-2xl mr-2">{emoji}</span>
              반응한 사용자
            </DrawerTitle>
            <DrawerDescription className="text-center">
              {users.length}명이 반응했습니다
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            {users.map((user) => (
              <div key={user.userId} className="flex items-center gap-3 py-2 border-b last:border-0">
                <Avatar className="size-8">
                  <AvatarImage src={user.userProfileImage} alt={user.userName} />
                  <AvatarFallback>{user.userName[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{user.userName}</span>
                {user.userId === currentUserId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(emoji, currentUserId)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">닫기</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}; 