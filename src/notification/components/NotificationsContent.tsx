import { Loader2 } from 'lucide-react';
import { RefObject } from 'react';
import NotificationsList from '@/notification/components/NotificationsList';
import { Notification } from '@/notification/model/Notification';
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
    <div className="h-full">
      <ScrollArea className="h-full" id={scrollAreaId}>
        <div ref={scrollRef} className="space-y-0">
          <NotificationsList notifications={notifications} />
          <div ref={observerRef} className="h-10 w-full" />
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