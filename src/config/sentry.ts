/**
 * Sentry 에러 추적 설정
 *
 * 프로덕션 환경에서만 활성화되며, 개발 중에는 로컬 로그만 사용합니다.
 */

import * as Sentry from '@sentry/react-native';
import { logger } from '../utils/logger';

// Sentry 활성화 여부
const SENTRY_ENABLED = !__DEV__;

// Sentry DSN (환경 변수로 관리 - 나중에 설정)
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

/**
 * Sentry 초기화
 */
export const initSentry = () => {
  if (!SENTRY_ENABLED) {
    logger.log('✅ Sentry disabled in development mode');
    return;
  }

  if (!SENTRY_DSN) {
    logger.warn('⚠️ Sentry DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,

      // 환경 설정
      environment: __DEV__ ? 'development' : 'production',

      // 릴리즈 버전 (앱 버전과 동일하게)
      release: 'heart-stamp@1.0.0',

      // 샘플링 비율 (100% = 모든 에러 수집)
      tracesSampleRate: 1.0,

      // 디버그 모드 (개발 중에만)
      debug: __DEV__,

      // 에러 전송 전 필터링/수정
      beforeSend(event, hint) {
        // 민감한 정보 제거
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }

        // 사용자 정보에서 PII 제거
        if (event.user) {
          delete event.user.email;
          delete event.user.username;
          // UUID는 유지 (디버깅에 필요)
        }

        return event;
      },

      // 무시할 에러 패턴
      ignoreErrors: [
        // 네트워크 관련 일시적 에러
        'Network request failed',
        'Network Error',
        'NetworkError',

        // 사용자가 취소한 작업
        'AbortError',
        'User cancelled',

        // React Navigation 관련 일반적인 경고
        'Non-serializable values were found in the navigation state',
      ],

      // 통합 기능 설정
      integrations: [
        // React Native 특화 통합
        new Sentry.ReactNativeTracing({
          // 자동 성능 추적
          tracingOrigins: ['localhost', /^\//],

          // 라우팅 추적 (React Navigation)
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
        }),
      ],
    });

    logger.log('✅ Sentry initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize Sentry:', error);
  }
};

/**
 * 에러를 Sentry에 수동으로 전송
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (!SENTRY_ENABLED) {
    logger.error('Error (not sent to Sentry):', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * 사용자 정보 설정 (디버깅용)
 */
export const setUser = (userId: string) => {
  if (!SENTRY_ENABLED) return;

  Sentry.setUser({
    id: userId,
    // 이메일, 이름 등은 개인정보이므로 추가하지 않음
  });
};

/**
 * 커스텀 이벤트 로깅 (breadcrumb)
 */
export const addBreadcrumb = (message: string, data?: Record<string, any>) => {
  if (!SENTRY_ENABLED) return;

  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
};

/**
 * 성능 트랜잭션 시작
 */
export const startTransaction = (name: string, op: string) => {
  if (!SENTRY_ENABLED) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
};
