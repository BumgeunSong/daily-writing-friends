import NotificationsHeader from '@/notification/components/NotificationsHeader';
import { Card } from '@/shared/ui/card';
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
        <div className="h-full overflow-y-auto" id={scrollAreaId}>
          <div>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <Skeleton 
                key={index} 
                className="mb-4 h-10 w-full" 
                data-testid="notification-skeleton"
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}; 