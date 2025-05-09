import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import StatusMessage from '@/components/common/StatusMessage';

const NotificationsFallback = () => {
  return (
    <div className="p-4 text-center">
      <p className="text-muted-foreground">
        알림을 불러오는 중 오류가 발생했습니다.
      </p>
    </div>
  );
};

/**
 * 알림 관련 에러를 처리하는 에러 바운더리
 */
export const NotificationsErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary
      fallback={NotificationsFallback}
      onError={(error) => {
        console.error('Notifications Error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}; 