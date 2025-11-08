/**
 * Analytics 설정
 *
 * 개발 모드와 프로덕션 모드에서의 Analytics 동작을 제어합니다.
 */

export const ANALYTICS_CONFIG = {
  /**
   * Analytics 추적 활성화 여부
   * - 개발 모드(__DEV__ = true): Firebase로 전송하지 않음
   * - 프로덕션 모드(__DEV__ = false): Firebase로 전송
   */
  enableTracking: !__DEV__,

  /**
   * 콘솔 로그 출력 여부
   * - true: 이벤트 발생 시 콘솔에 로그 출력 (디버깅용)
   * - false: 로그 출력 안 함
   */
  enableLogging: true,

  /**
   * 개발 모드에서 강제로 Firebase 전송 활성화
   * - true: 개발 모드에서도 Firebase Console에서 실시간 테스트 가능
   * - false: 개발 모드에서는 로그만 출력 (기본값, 권장)
   *
   * ⚠️ 주의: true로 설정 시 개발 중 테스트 데이터가 Firebase에 쌓입니다.
   * 실제 사용자 분석 데이터가 오염될 수 있으므로 테스트 후 반드시 false로 되돌리세요.
   */
  forceEnableInDev: false,
};
