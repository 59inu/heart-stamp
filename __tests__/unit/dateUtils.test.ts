/**
 * Date utilities 테스트
 *
 * 목적: ISO 8601 주차 계산 로직 검증
 */

import { getWeekNumber } from '../../src/utils/dateUtils';

describe('dateUtils - getWeekNumber', () => {
  it('should calculate week 1 of 2025 correctly', () => {
    // 2025년 1월 1일은 수요일
    // ISO 8601: 첫 목요일이 있는 주가 1주차
    const jan1 = new Date(2025, 0, 1); // 수요일
    const result = getWeekNumber(jan1);

    expect(result.year).toBe(2025);
    expect(result.week).toBe(1);
  });

  it('should calculate week 1 of 2024 correctly', () => {
    // 2024년 1월 1일은 월요일
    const jan1 = new Date(2024, 0, 1); // 월요일
    const result = getWeekNumber(jan1);

    expect(result.year).toBe(2024);
    expect(result.week).toBe(1);
  });

  it('should handle year transition correctly', () => {
    // 2024년 12월 30일 (월요일)은 2025년 1주차에 속함
    const dec30 = new Date(2024, 11, 30); // 월요일
    const result = getWeekNumber(dec30);

    expect(result.year).toBe(2025);
    expect(result.week).toBe(1);
  });

  it('should calculate mid-year week correctly', () => {
    // 2025년 7월 15일 (화요일)
    const july15 = new Date(2025, 6, 15);
    const result = getWeekNumber(july15);

    expect(result.year).toBe(2025);
    expect(result.week).toBeGreaterThan(20);
    expect(result.week).toBeLessThan(35);
  });

  it('should handle leap year correctly', () => {
    // 2024년은 윤년 (2월 29일 존재)
    const feb29 = new Date(2024, 1, 29);
    const result = getWeekNumber(feb29);

    expect(result.year).toBe(2024);
    expect(result.week).toBeGreaterThan(0);
    expect(result.week).toBeLessThan(54);
  });

  it('should be consistent for same week dates', () => {
    // 같은 주의 월요일과 일요일은 같은 주차
    const monday = new Date(2025, 0, 6); // 월요일
    const sunday = new Date(2025, 0, 12); // 일요일

    const mondayResult = getWeekNumber(monday);
    const sundayResult = getWeekNumber(sunday);

    expect(mondayResult.week).toBe(sundayResult.week);
    expect(mondayResult.year).toBe(sundayResult.year);
  });

  it('should handle end of year correctly', () => {
    // 2025년 12월 31일 (수요일)은 2026년 1주차에 속함 (ISO 8601)
    const dec31 = new Date(2025, 11, 31);
    const result = getWeekNumber(dec31);

    // ISO 8601: 목요일이 있는 주가 그 해에 속함
    // 12월 31일(수)이 포함된 주의 목요일은 2026년 1월 1일
    expect(result.year).toBe(2026);
    expect(result.week).toBe(1);
  });

  it('should not mutate input date', () => {
    const originalDate = new Date(2025, 6, 15);
    const originalTime = originalDate.getTime();

    getWeekNumber(originalDate);

    // 원본 날짜가 변경되지 않았는지 확인
    expect(originalDate.getTime()).toBe(originalTime);
  });
});
