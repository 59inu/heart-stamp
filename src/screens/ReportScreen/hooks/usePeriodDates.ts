import { useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isFuture,
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
    return !isFuture(endDate);
  }, [endDate]);

  return { startDate, endDate, isPeriodCompleted };
};
