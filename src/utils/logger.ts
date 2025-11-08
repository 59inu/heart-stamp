/**
 * Logger utility for development and production environments
 *
 * - Development: All logs go to console
 * - Production: Errors and warnings are sent to Sentry
 */

import * as Sentry from '@sentry/react-native';

const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args: any[]) => {
    // 항상 콘솔에 출력
    console.error(...args);

    // 프로덕션에서는 Sentry로 전송
    if (!isDevelopment) {
      // Error 객체가 있으면 exception으로 전송
      const error = args.find(arg => arg instanceof Error);
      if (error) {
        Sentry.captureException(error, {
          extra: {
            additionalInfo: args.filter(arg => !(arg instanceof Error)),
          },
        });
      } else {
        // Error 객체가 없으면 메시지로 전송
        Sentry.captureMessage(args.join(' '), 'error');
      }
    }
  },

  warn: (...args: any[]) => {
    // 항상 콘솔에 출력
    console.warn(...args);

    // 프로덕션에서는 Sentry로 전송 (warning 레벨)
    if (!isDevelopment) {
      Sentry.captureMessage(args.join(' '), 'warning');
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};
