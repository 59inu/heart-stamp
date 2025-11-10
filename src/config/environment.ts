/**
 * 환경별 설정
 *
 * - local: 로컬 개발 (npx expo start)
 * - development: Railway Dev 서버 (EAS development/preview build)
 * - production: Railway Prod 서버 (EAS production build, App Store)
 */

import { logger } from '../utils/logger';

// 환경 타입
export type Environment = 'local' | 'development' | 'production';

// 현재 환경 결정
const getEnvironment = (): Environment => {
  // 개발 모드면 무조건 로컬
  if (__DEV__) {
    return 'local';
  }

  // 프로덕션 빌드일 때는 환경 변수로 구분
  // EAS Build에서 APP_ENV 환경 변수 주입
  const appEnv = process.env.APP_ENV;

  if (appEnv === 'production') {
    return 'production';
  }

  // development 또는 preview 빌드
  return 'development';
};

export const ENV = getEnvironment();

// 환경별 API 엔드포인트
export const API_ENDPOINTS = {
  local: 'http://192.168.0.14:3000/api',
  development: 'https://heart-stamp-dev.up.railway.app/api',
  production: 'https://heart-stamp-production.up.railway.app/api',
};

// 현재 환경의 API URL
export const API_BASE_URL = API_ENDPOINTS[ENV];

// 디버깅용
logger.log(`🌐 Environment: ${ENV}`);
logger.log(`🌐 API Base URL: ${API_BASE_URL}`);
