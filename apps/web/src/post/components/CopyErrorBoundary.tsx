import * as Sentry from '@sentry/react';
import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type React from 'react';
import { Component } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';

interface CopyErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface CopyErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * 복사 기능 관련 에러를 처리하는 에러 바운더리
 * 복사 기능 실패 시에도 앱이 정상적으로 작동하도록 보장
 */
export class CopyErrorBoundary extends Component<CopyErrorBoundaryProps, CopyErrorBoundaryState> {
  constructor(props: CopyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): CopyErrorBoundaryState {
    // 복사 관련 에러만 캐치 (다른 에러는 상위로 전파)
    const isCopyError =
      error.message.includes('copy') ||
      error.message.includes('clipboard') ||
      error.message.includes('convertHtmlToText');

    if (isCopyError) {
      return {
        hasError: true,
        errorMessage: error.message,
      };
    }

    // 복사 관련 에러가 아니면 에러를 다시 던져서 상위 에러 바운더리가 처리하도록 함
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 복사 관련 에러 로깅
    console.error('Copy functionality error:', error, errorInfo);

    // Sentry로 에러 리포팅 (정적 임포트 사용)
    Sentry.withScope((scope) => {
      scope.setLevel('warning'); // 복사 에러는 warning 레벨로 설정
      scope.setTag('errorType', 'copy-functionality');
      scope.setContext('copyError', {
        componentStack: errorInfo.componentStack,
        errorMessage: error.message,
      });
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      // 사용자가 제공한 fallback이 있으면 사용, 없으면 기본 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert variant='default' className='my-2 border-orange-200 bg-orange-50'>
          <AlertCircle className='size-4 text-orange-600' />
          <AlertTitle className='text-orange-800'>복사 기능 오류</AlertTitle>
          <AlertDescription className='text-orange-700'>
            <p className='mb-2'>텍스트 복사 기능에 일시적인 문제가 발생했습니다.</p>
            <p className='text-sm'>
              브라우저의 기본 복사 기능(Ctrl+C 또는 우클릭 → 복사)을 사용해주세요.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * 함수형 컴포넌트용 래퍼
 */
export const withCopyErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  const WrappedComponent = (props: P) => (
    <CopyErrorBoundary>
      <Component {...props} />
    </CopyErrorBoundary>
  );

  // displayName을 함수 외부에서 할당하여 매번 재생성되는 것을 방지
  WrappedComponent.displayName = `withCopyErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
};
