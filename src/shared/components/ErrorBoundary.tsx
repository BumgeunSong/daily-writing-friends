import * as Sentry from '@sentry/react';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { setSentryContext, setSentryTags } from '@/sentry';

interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error) => ReactNode);
  children: ReactNode;
  context?: string; // Optional context identifier for the error boundary
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Set context for this specific error
    if (this.props.context) {
      setSentryTags({
        errorBoundary: this.props.context,
        errorLocation: 'ErrorBoundary',
      });
      setSentryContext('errorBoundary', {
        context: this.props.context,
        componentStack: errorInfo.componentStack,
      });
    }

    // Report to Sentry with additional context
    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
        errorBoundaryContext: this.props.context || 'generic',
      });
      Sentry.captureException(error);
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error!);
      }
      return this.props.fallback;
    }

    return this.props.children;
  }
} 