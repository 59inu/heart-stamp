import { useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type ReportPeriod = 'week' | 'month';

export const usePeriodText = (
  period: ReportPeriod,
  startDate: Date,
  endDate: Date,
  currentDate: Date
) => {
  return useMemo(() => {
    if (period === 'week') {
      return `${format(startDate, 'M월 d일', { locale: ko })} - ${format(endDate, 'M월 d일', { locale: ko })}`;
    } else {
      return format(currentDate, 'yyyy년 M월', { locale: ko });
    }
  }, [period, startDate, endDate, currentDate]);
};
