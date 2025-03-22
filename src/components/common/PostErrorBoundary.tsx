import React from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import * as Sentry from '@sentry/react';

interface PostErrorBoundaryProps {
  children: React.ReactNode;
}

interface PostErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PostErrorBoundary extends React.Component<PostErrorBoundaryProps, PostErrorBoundaryState> {
  constructor(props: PostErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('게시물 로딩 오류:', error, errorInfo);
    Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return <PostErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface PostErrorFallbackProps {
  error: Error | null;
}

const PostErrorFallback: React.FC<PostErrorFallbackProps> = ({ error }) => {
  const isOnline = useOnlineStatus();

  // 오프라인 에러 처리
  if (!isOnline && error?.message.includes('오프라인')) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <WifiOff className="size-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          오프라인 상태입니다
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          인터넷 연결이 없으며 이 게시물의 캐시된 데이터가 없습니다. 
          인터넷에 연결되면 자동으로 새로고침됩니다.
        </p>
      </div>
    );
  }
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>게시물을 불러오는 중 오류가 발생했습니다</AlertTitle>
      <AlertDescription>
        <p className="mt-1 text-sm font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
          {error?.message || '알 수 없는 오류'}
        </p>
        <p className="mt-2 text-sm">
          페이지를 새로고침하거나 나중에 다시 시도해주세요.
          문제가 계속되면 관리자에게 문의해주세요.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default PostErrorBoundary; 