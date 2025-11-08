import React, { Component, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

/**
 * 비동기 에러를 캐치하는 Wrapper
 *
 * React Error Boundary는 동기 렌더링 에러만 캐치하므로,
 * useEffect, setTimeout, Promise 등의 비동기 에러는 별도 처리 필요
 *
 * 사용법:
 * ```tsx
 * <AsyncErrorBoundary>
 *   <ComponentWithAsyncOperations />
 * </AsyncErrorBoundary>
 * ```
 */
export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  componentDidMount() {
    // 전역 에러 핸들러 등록
    this.setupGlobalErrorHandlers();
  }

  componentWillUnmount() {
    // 전역 에러 핸들러 제거
    this.removeGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers = () => {
    // Promise rejection 핸들러
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  };

  private removeGlobalErrorHandlers = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    logger.error('❌ [AsyncErrorBoundary] Unhandled Promise Rejection:', error);

    this.setState({ error });

    if (this.props.onError) {
      this.props.onError(error);
    }
  };

  resetError = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) {
        return fallback(error, this.resetError);
      }

      // 기본 ErrorBoundary로 fallback
      return (
        <ErrorBoundary level="screen">
          {children}
        </ErrorBoundary>
      );
    }

    return children;
  }
}

/**
 * 비동기 작업을 Error Boundary로 감싸는 HOC
 */
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  onError?: (error: Error) => void
) {
  return (props: P) => (
    <AsyncErrorBoundary onError={onError}>
      <Component {...props} />
    </AsyncErrorBoundary>
  );
}
