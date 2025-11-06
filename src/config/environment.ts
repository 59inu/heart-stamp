/**
 * 환경별 설정
 *
 * - local: 로컬 개발 (npx expo start)
 * - dev: Railway Dev 서버 (Expo Publish, TestFlight)
 * - prd: Railway Prd 서버 (App Store/Play Store)
 */

// 환경 타입
export type Environment = 'local' | 'dev' | 'prd';

// 현재 환경 결정
// 나중에 app.config.js나 EAS Build 설정에서 주입할 수 있음
const getEnvironment = (): Environment => {
  // 개발 모드면 무조건 로컬
  if (__DEV__) {
    return 'local';
  }

  // 프로덕션 빌드일 때는 환경 변수로 구분
  // TODO: EAS Build 채널로 dev/prd 구분
  // @ts-ignore - Constants.expoConfig는 런타임에 존재
  // const releaseChannel = Constants.expoConfig?.extra?.releaseChannel;
  // if (releaseChannel === 'production') return 'prd';

  // 현재는 dev만 사용
  return 'dev';
};

export const ENV = getEnvironment();

// 환경별 API 엔드포인트
export const API_ENDPOINTS = {
  local: 'http://192.168.0.14:3000/api',
  dev: 'https://heart-stamp-dev.up.railway.app/api',
  prd: 'https://heart-stamp.up.railway.app/api', // TODO: 나중에 생성
};

// 현재 환경의 API URL
export const API_BASE_URL = API_ENDPOINTS[ENV];

// 디버깅용
console.log(`🌐 Environment: ${ENV}`);
console.log(`🌐 API Base URL: ${API_BASE_URL}`);
