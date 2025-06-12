import { Loader2 } from 'lucide-react';
import { RefObject } from 'react';
import NotificationsList from '@/notification/components/NotificationsList';
import { Notification } from '@/notification/model/Notification';
import { Card } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';

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
    <div className="flex-1">
      <ScrollArea className="h-[calc(100vh-8rem)]" id={scrollAreaId}>
        <div ref={scrollRef} className="space-y-0">
          <NotificationsList notifications={notifications} />
          <div ref={observerRef} />
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 
                className="size-4 animate-spin text-muted-foreground"
                data-testid="loading-more-indicator"
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}; 