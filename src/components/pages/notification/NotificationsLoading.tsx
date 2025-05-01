import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationsHeader from './NotificationsHeader';

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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <NotificationsHeader />
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" id={scrollAreaId}>
          <div>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <Skeleton 
                key={index} 
                className="h-10 w-full mb-4" 
                data-testid="notification-skeleton"
              />
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}; 