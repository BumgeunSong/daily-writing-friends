import NotificationsHeader from '@/notification/components/NotificationsHeader';
import { Card } from '@/shared/ui/card';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Skeleton } from '@/shared/ui/skeleton';

interface NotificationsLoadingProps {
  scrollAreaId: string;
  skeletonCount: number;
}

/**
 * 알림 목록 로딩 상태를 표시하는 컴포넌트
 */
export const NotificationsLoading = ({ 
  scrollAreaId, 
  skeletonCount 
}: NotificationsLoadingProps) => {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <NotificationsHeader />
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" id={scrollAreaId}>
          <div>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <Skeleton 
                key={index} 
                className="mb-4 h-10 w-full" 
                data-testid="notification-skeleton"
              />
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}; 