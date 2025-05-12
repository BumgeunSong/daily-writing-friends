import { Loader2 } from 'lucide-react';
import { RefObject } from 'react';
import { Card } from '@shared/ui/card';
import { ScrollArea } from '@shared/ui/scroll-area';
import NotificationsList from './NotificationsList';
import { Notification } from '@/types/Notification';

interface NotificationsContentProps {
  scrollAreaId: string;
  notifications: Notification[];
  scrollRef: RefObject<HTMLDivElement>;
  observerRef: (node?: Element | null) => void;
  isLoadingMore: boolean;
}

/**
 * 알림 목록의 메인 컨텐츠를 표시하는 컴포넌트
 */
export const NotificationsContent = ({
  scrollAreaId,
  notifications,
  scrollRef,
  observerRef,
  isLoadingMore
}: NotificationsContentProps) => {
  return (
    <Card className="flex-1 overflow-hidden">
      <ScrollArea className="h-full" id={scrollAreaId}>
        <div ref={scrollRef}>
          <NotificationsList notifications={notifications} />
          <div ref={observerRef} />
          {isLoadingMore && (
            <div className="flex items-center justify-center p-4">
              <Loader2 
                className="size-4 animate-spin"
                data-testid="loading-more-indicator"
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}; 