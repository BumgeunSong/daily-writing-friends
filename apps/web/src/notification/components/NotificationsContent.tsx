import { Loader2 } from 'lucide-react';
import type { RefObject } from 'react';
import NotificationsList from '@/notification/components/NotificationsList';
import type { Notification } from '@/notification/model/Notification';

interface NotificationsContentProps {
  scrollAreaId: string;
  notifications: Notification[];
  scrollRef: RefObject<HTMLDivElement | null>;
  observerRef: (node: Element | null) => void;
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
      <div className="h-full overflow-y-auto" id={scrollAreaId}>
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
      </div>
    </div>
  );
}; 