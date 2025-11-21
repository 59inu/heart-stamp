/**
 * TZ 환경변수 기준 날짜 계산 유틸리티
 *
 * Railway 서버는 UTC이지만, TZ=Asia/Seoul 설정으로 한국 시간 기준 날짜를 계산합니다.
 */

/**
 * TZ 환경변수 기준으로 현재 날짜에서 offsetDays만큼 이동한 날짜의 YYYY-MM-DD 문자열 반환
 * @param offsetDays 오프셋 (0=오늘, -1=어제, 1=내일)
 * @returns YYYY-MM-DD 형식 문자열
 */
export function getTZDateString(offsetDays: number = 0): string {
  const TZ = process.env.TZ || 'UTC';
  const now = new Date();

  // TZ 기준으로 날짜 문자열 생성
  const tzDateString = now.toLocaleString('en-US', { timeZone: TZ });
  const tzDate = new Date(tzDateString);

  // 오프셋 적용
  tzDate.setDate(tzDate.getDate() + offsetDays);

  const year = tzDate.getFullYear();
  const month = String(tzDate.getMonth() + 1).padStart(2, '0');
  const day = String(tzDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * TZ 환경변수 기준 오늘 날짜 (YYYY-MM-DD)
 */
export function getTodayTZ(): string {
  return getTZDateString(0);
}

/**
 * TZ 환경변수 기준 어제 날짜 (YYYY-MM-DD)
 */
export function getYesterdayTZ(): string {
  return getTZDateString(-1);
}

/**
 * TZ 환경변수 기준 내일 날짜 (YYYY-MM-DD)
 */
export function getTomorrowTZ(): string {
  return getTZDateString(1);
}
