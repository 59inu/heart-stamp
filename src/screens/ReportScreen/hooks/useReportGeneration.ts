import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getWeekNumber } from '../../../utils/dateUtils';
import { logger } from '../../../utils/logger';
import { apiService } from '../../../services/apiService';

type ReportPeriod = 'week' | 'month';

export const useReportGeneration = (
  period: ReportPeriod,
  currentDate: Date,
  loadReport: () => Promise<void>
) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = useCallback(async () => {
    if (period !== 'week') return; // 현재는 주간만 지원

    setIsGenerating(true);

    try {
      const { year, week } = getWeekNumber(currentDate);
      logger.log(`📝 Generating weekly report: ${year} week ${week}`);
      const result = await apiService.createWeeklyReport(year, week);

      if (result.success) {
        logger.log('✅ Report generated successfully');
        // 리포트 재로드
        await loadReport();
      } else {
        logger.error('❌ Failed to generate report:', result.error);
        Alert.alert('리포트 생성 실패', result.error);
      }
    } catch (error) {
      logger.error('Error generating report:', error);
      Alert.alert('오류', '리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }, [period, currentDate, loadReport]);

  return {
    isGenerating,
    handleGenerateReport,
  };
};
