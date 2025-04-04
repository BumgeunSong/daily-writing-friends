import React, { useState, useEffect } from "react";
import { ReactionDrawer } from "@/components/reaction/ReactionDrawer";
import { ReactionTooltip } from "@/components/reaction/ReactionTooltip";
import { LongPressEventType, useLongPress } from "use-long-press";

interface ReactionUser {
  userId: string;
  userName: string;
  userProfileImage: string;
}

interface Reaction {
  content: string; // 이모지
  by: ReactionUser[];
}

interface EmojiReactionProps {
  reactions: Reaction[];
  onDelete: (emoji: string, userId: string) => void;
  currentUserId: string;
}

const EmojiReaction: React.FC<EmojiReactionProps> = ({ 
  reactions, 
  onDelete,
  currentUserId
}) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 이모지별로 그룹화
  const groupedReactions = reactions.reduce<Record<string, ReactionUser[]>>((acc, reaction) => {
    acc[reaction.content] = reaction.by;
    return acc;
  }, {});

  const handleEmojiClick = (emoji: string) => {
    // 현재 사용자가 이 이모지에 반응했는지 확인
    const users = groupedReactions[emoji];
    const userReacted = users.some(user => user.userId === currentUserId);
    
    if (userReacted) {
      onDelete(emoji, currentUserId);
    }
  };

  const handleShowDrawer = (emoji: string) => {
    setSelectedEmoji(emoji);
    setIsDrawerOpen(true);
  };


  // use-long-press 라이브러리 사용
  
  const bind = useLongPress((_, { context }) => {
    if (isMobile && context) {
      handleShowDrawer(context as string);
    }
  }, {
    threshold: 500, // 500ms
    captureEvent: true,
    cancelOnMovement: 10, // 10px 이상 움직이면 취소
    detect: LongPressEventType.Touch, // 모바일에서는 터치 이벤트만 감지
  });

  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {Object.entries(groupedReactions).map(([emoji, users]) => (
        isMobile ? (
          <div
            key={emoji}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-sm
              bg-muted hover:bg-muted/80 transition-colors cursor-pointer
              ${users.some(user => user.userId === currentUserId) ? 'ring-1 ring-primary' : ''}
            `}
            onClick={() => handleEmojiClick(emoji)}
            {...bind(emoji)}
          >
            <span>{emoji}</span>
            <span className="text-xs text-muted-foreground">{users.length}</span>
          </div>
        ) : (
          <ReactionTooltip
            key={emoji}
            emoji={emoji}
            users={users}
            currentUserId={currentUserId}
            onClick={() => handleEmojiClick(emoji)}
          />
        )
      ))}

      {/* 모바일용 Drawer */}
      {selectedEmoji && (
        <ReactionDrawer
          emoji={selectedEmoji}
          users={groupedReactions[selectedEmoji] || []}
          currentUserId={currentUserId}
          isOpen={isDrawerOpen && isMobile}
          onOpenChange={setIsDrawerOpen}
          onDelete={onDelete}
        />
      )}
    </div>
  );
};

export default EmojiReaction;
