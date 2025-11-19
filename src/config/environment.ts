/**
 * 환경별 설정
 *
 * - local: 로컬 개발 (npx expo start)
 * - development: Railway Dev 서버 (EAS development/preview build)
 * - production: Railway Prod 서버 (EAS production build, App Store)
 */

import Constants from 'expo-constants';
import { logger } from '../utils/logger';

// 환경 타입
export type Environment = 'local' | 'development' | 'production';

// 현재 환경 결정
const getEnvironment = (): Environment => {
  // 로컬 개발 모드
  if (__DEV__) {
    return 'local';
  }

  // 프로덕션 빌드일 때는 환경 변수로 구분
  // EAS Build에서 APP_ENV 환경 변수 주입 (app.config.js의 extra를 통해 전달)
  const appEnv = Constants.expoConfig?.extra?.appEnv;

  if (appEnv === 'production') {
    return 'production';
  }

  // development 또는 preview 빌드
  return 'development';
};

export const ENV = getEnvironment();

// 환경별 API 엔드포인트
export const API_ENDPOINTS = {
  local: 'http://192.168.0.14:3000/api', // 로컬 서버
  development: 'https://heart-stamp-dev.up.railway.app/api',
  production: 'https://api.heartstamp.kr/api', // 커스텀 도메인
};

// 현재 환경의 API URL
export const API_BASE_URL = API_ENDPOINTS[ENV];

// 런타임 환경 검증 (프로덕션 빌드인데 development 환경이면 경고)
if (!__DEV__ && ENV !== 'production') {
  const appEnv = Constants.expoConfig?.extra?.appEnv;
  logger.warn(
    `⚠️ CRITICAL: Release build is using ${ENV} environment!`,
    `Expected: production, Got: ${ENV}`,
    `API URL: ${API_BASE_URL}`,
    `appEnv from config: ${appEnv}`,
    `This means the app will connect to the wrong server!`
  );
}

// 디버깅용 로그 (개발 환경에서만 출력됨)
logger.log(`🌐 Environment: ${ENV}`);
logger.log(`🌐 API Base URL: ${API_BASE_URL}`);
logger.log(`🌐 __DEV__: ${__DEV__}`);
logger.log(`🌐 appEnv from config: ${Constants.expoConfig?.extra?.appEnv}`);
