import { getISOWeek, getISOWeekYear } from 'date-fns';

// ISO 8601 주차 계산 (월요일 시작)
// date-fns를 사용하여 정확한 ISO week 계산
export function getWeekNumber(date: Date): { year: number; week: number } {
  return {
    year: getISOWeekYear(date),
    week: getISOWeek(date),
  };
}
