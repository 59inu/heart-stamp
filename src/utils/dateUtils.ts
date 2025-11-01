// ISO 8601 주차 계산 (월요일 시작)
export function getWeekNumber(date: Date): { year: number; week: number } {
  const target = new Date(date.valueOf());

  // 해당 주의 목요일을 찾음 (ISO 8601에서는 목요일이 있는 주가 그 해에 속함)
  const dayNr = (target.getDay() + 6) % 7; // 월요일=0, 일요일=6
  target.setDate(target.getDate() - dayNr + 3);

  // 목요일이 속한 해의 첫 목요일
  const yearStart = new Date(target.getFullYear(), 0, 1);
  const yearStartDay = (yearStart.getDay() + 6) % 7;
  const firstThursday = new Date(yearStart);
  firstThursday.setDate(yearStart.getDate() + (3 - yearStartDay + 7) % 7);

  // 첫 목요일부터 현재 목요일까지의 주 수 계산
  const weekNum = 1 + Math.floor((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));

  return {
    year: target.getFullYear(),
    week: weekNum,
  };
}
