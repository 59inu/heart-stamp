import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { logger } from '../utils/logger';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'screen' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary 컴포넌트
 *
 * 사용법:
 * ```tsx
 * <ErrorBoundary level="app">
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 에러 발생 시 상태 업데이트
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 정보를 state에 저장
    this.setState({
      errorInfo,
    });

    // 에러 로깅
    logger.error('❌ [ErrorBoundary] Caught error:', error);
    logger.error('❌ [ErrorBoundary] Error info:', errorInfo);

    // Sentry에 에러 전송
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      level: this.props.level === 'app' ? 'fatal' : 'error',
      tags: {
        boundary_level: this.props.level || 'component',
      },
    });

    // 커스텀 에러 핸들러 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 커스텀 fallback UI가 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // 레벨별 기본 fallback UI
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback(): ReactNode {
    const { level = 'component' } = this.props;
    const { error, errorInfo } = this.state;

    // 앱 레벨 에러 - 전체 화면
    if (level === 'app') {
      return (
        <SafeAreaView style={styles.appContainer}>
          <View style={styles.content}>
            <Ionicons name="alert-circle" size={80} color={COLORS.error} />
            <Text style={styles.title}>앗, 문제가 발생했어요</Text>
            <Text style={styles.message}>
              앱을 실행하는 중에 오류가 발생했습니다.{'\n'}
              다시 시도해주세요.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.resetError}
            >
              <Text style={styles.primaryButtonText}>다시 시작하기</Text>
            </TouchableOpacity>

            {__DEV__ && (
              <ScrollView style={styles.debugContainer}>
                <Text style={styles.debugTitle}>개발자 정보:</Text>
                <Text style={styles.debugText}>{error?.toString()}</Text>
                <Text style={styles.debugText}>{errorInfo?.componentStack}</Text>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      );
    }

    // 스크린 레벨 에러 - 화면 내 영역
    if (level === 'screen') {
      return (
        <View style={styles.screenContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
          <Text style={styles.screenTitle}>화면을 불러올 수 없어요</Text>
          <Text style={styles.screenMessage}>
            일시적인 문제가 발생했습니다.{'\n'}
            다시 시도해주세요.
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={this.resetError}
          >
            <Text style={styles.secondaryButtonText}>다시 시도</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>에러:</Text>
              <Text style={styles.debugText}>{error?.message}</Text>
            </View>
          )}
        </View>
      );
    }

    // 컴포넌트 레벨 에러 - 작은 영역
    return (
      <View style={styles.componentContainer}>
        <Ionicons name="warning-outline" size={24} color={COLORS.error} />
        <Text style={styles.componentMessage}>내용을 표시할 수 없습니다</Text>
        <TouchableOpacity onPress={this.resetError}>
          <Text style={styles.retryLink}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  // 앱 레벨
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // 스크린 레벨
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  screenMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // 컴포넌트 레벨
  componentContainer: {
    padding: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffebeb',
    alignItems: 'center',
  },
  componentMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
  },
  retryLink: {
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },

  // 디버그 정보
  debugContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    maxHeight: 200,
    width: '100%',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
});
