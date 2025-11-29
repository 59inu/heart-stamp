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
 * @param tableAlias 테이블 별칭 (예: 'd', 'ufd'). 생략 시 "userId"만 사용.
 * @returns "AND table."userId" NOT IN (...)" 형태의 문자열. 제외할 사용자가 없으면 빈 문자열 반환.
 */
export const getExcludeUserCondition = (tableAlias?: string): string => {
  if (EXCLUDED_USER_IDS.length === 0) return '';
  const ids = EXCLUDED_USER_IDS.map(id => `'${id}'`).join(', ');
  const userIdColumn = tableAlias ? `${tableAlias}."userId"` : `"userId"`;
  return `AND ${userIdColumn} NOT IN (${ids})`;
};
