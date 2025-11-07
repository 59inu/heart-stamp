import { useState, useCallback } from 'react';
import { subWeeks, subMonths } from 'date-fns';
import { Report } from '../../../models/Report';
import { apiService } from '../../../services/apiService';
import { getWeekNumber } from '../../../utils/dateUtils';
import { logger } from '../../../utils/logger';

type ReportPeriod = 'week' | 'month';

export const useReportData = (
  period: ReportPeriod,
  currentDate: Date,
  isPeriodCompleted: boolean
) => {
  const [report, setReport] = useState<Report | null>(null);
  const [previousReport, setPreviousReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diaryCount, setDiaryCount] = useState<number | undefined>();
  const [canGenerate, setCanGenerate] = useState(false);

  const loadReport = useCallback(async () => {
    if (!isPeriodCompleted) {
      setReport(null);
      setPreviousReport(null);
      setError('not_completed');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setPreviousReport(null);
    setCanGenerate(false);

    try {
      if (period === 'week') {
        const { year, week } = getWeekNumber(currentDate);
        logger.log(`📊 Requesting weekly report: ${year} week ${week}`);
        const result = await apiService.getWeeklyReport(year, week);

        if (result.success) {
          setReport(result.report);
          logger.log('✅ Report loaded successfully');

          // 이전 주 리포트 로드 (optional)
          const previousWeekDate = subWeeks(currentDate, 1);
          const { year: prevYear, week: prevWeek } = getWeekNumber(previousWeekDate);
          const prevResult = await apiService.getWeeklyReport(prevYear, prevWeek);
          if (prevResult.success) {
            setPreviousReport(prevResult.report);
            logger.log('✅ Previous week report loaded');
          }
        } else {
          logger.log(`❌ Report error: ${result.error}, diaryCount: ${result.diaryCount}, canGenerate: ${result.canGenerate}`);
          setError(result.error);
          setDiaryCount(result.diaryCount);
          setCanGenerate(result.canGenerate || false);
        }
      } else {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        logger.log(`📊 Requesting monthly report: ${year} month ${month}`);
        const result = await apiService.getMonthlyReport(year, month);

        if (result.success) {
          setReport(result.report);
          logger.log('✅ Report loaded successfully');

          // 이전 달 리포트 로드 (optional)
          const previousMonthDate = subMonths(currentDate, 1);
          const prevYear = previousMonthDate.getFullYear();
          const prevMonth = previousMonthDate.getMonth() + 1;
          const prevResult = await apiService.getMonthlyReport(prevYear, prevMonth);
          if (prevResult.success) {
            setPreviousReport(prevResult.report);
            logger.log('✅ Previous month report loaded');
          }
        } else {
          logger.log(`❌ Report error: ${result.error}, diaryCount: ${result.diaryCount}`);
          setError(result.error);
          setDiaryCount(result.diaryCount);
        }
      }
    } catch (err: any) {
      logger.error('❌ Error loading report:', err);
      logger.error('Error details:', err.message || err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period, currentDate, isPeriodCompleted]);

  return {
    report,
    previousReport,
    loading,
    error,
    diaryCount,
    canGenerate,
    loadReport,
  };
};
