/**
 * Analytics Helper
 * 통계 분석 시 공통적으로 사용되는 유틸리티 함수들
 */

// 통계에서 제외할 테스트/개발 사용자 ID
export const EXCLUDED_USER_IDS = [
  '1dadfbf4-c304-4a11-9e88-afeaf4d7e9e0', // 개발/테스트 계정
];

/**
 * SQL WHERE 절에 추가할 userId 제외 조건
 * @returns "AND "userId" NOT IN (...)" 형태의 문자열. 제외할 사용자가 없으면 빈 문자열 반환.
 */
export const getExcludeUserCondition = (): string => {
  if (EXCLUDED_USER_IDS.length === 0) return '';
  const ids = EXCLUDED_USER_IDS.map(id => `'${id}'`).join(', ');
  return `AND "userId" NOT IN (${ids})`;
};
