import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import NotificationsList from './NotificationsList';
import { Notification } from '@/types/Notification';
import { RefObject } from 'react';

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
            <div className="flex justify-center items-center p-4">
              <Loader2 
                className="w-4 h-4 animate-spin"
                data-testid="loading-more-indicator"
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}; 