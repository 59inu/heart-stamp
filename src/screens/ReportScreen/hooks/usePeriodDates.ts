import { useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  isAfter,
} from 'date-fns';

type ReportPeriod = 'week' | 'month';

export const usePeriodDates = (period: ReportPeriod, currentDate: Date) => {
  const { startDate, endDate } = useMemo(() => {
    if (period === 'week') {
      return {
        startDate: startOfWeek(currentDate, { weekStartsOn: 1 }),
        endDate: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        startDate: startOfMonth(currentDate),
        endDate: endOfMonth(currentDate),
      };
    }
  }, [period, currentDate]);

  const isPeriodCompleted = useMemo(() => {
    // 날짜만 비교 (시간 무시)
    const today = startOfDay(new Date());
    const periodEnd = startOfDay(endDate);
    // 기간 종료일이 오늘보다 이전이면 완료
    return !isAfter(periodEnd, today);
  }, [endDate]);

  return { startDate, endDate, isPeriodCompleted };
};
