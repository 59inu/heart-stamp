import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { subWeeks, subMonths } from 'date-fns';
import { RootStackParamList } from '../../navigation/types';
import { usePeriodDates } from './hooks/usePeriodDates';
import { useDominantMood } from './hooks/useDominantMood';
import { useReportData } from './hooks/useReportData';
import { usePeriodText } from './hooks/usePeriodText';
import { useReportGeneration } from './hooks/useReportGeneration';
import { ReportHeader } from './components/ReportHeader';
import { PeriodTabs } from './components/PeriodTabs';
import { PeriodNavigation } from './components/PeriodNavigation';
import { LoadingView } from './components/LoadingView';
import { ErrorStateRenderer } from './components/ErrorStateRenderer';
import { WarningBanner } from './components/WarningBanner';
import { SummarySection } from './components/SummarySection';
import { MoodStatsCard } from './components/MoodStatsCard';
import { KeywordTagsCard } from './components/KeywordTagsCard';
import { InfoCard } from './components/InfoCard';
import { InfoModal } from './components/InfoModal';
import { apiService } from '../../services/apiService';
import { getISOWeek } from 'date-fns';
import { COLORS } from '../../constants/colors';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { logger } from '../../utils/logger';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Report'>;

type ReportPeriod = 'week' | 'month';

export const ReportScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showInfoModal, setShowInfoModal] = useState(false);

  // 기간 계산
  const { startDate, endDate, isPeriodCompleted } = usePeriodDates(period, currentDate);

  // 리포트 데이터
  const {
    report,
    previousReport,
    loading,
    error,
    diaryCount,
    canGenerate,
    loadReport,
  } = useReportData(period, currentDate, isPeriodCompleted);

  // 가장 변동폭이 큰 감정과 전주/전월 대비 변화율 계산
  const dominantMoodInfo = useDominantMood(report, previousReport);

  // 기간 표시 텍스트
  const periodText = usePeriodText(period, startDate, endDate, currentDate);

  // 리포트 생성
  const { isGenerating, handleGenerateReport } = useReportGeneration(
    period,
    currentDate,
    loadReport
  );

  // 화면 포커스 시 리포트 로드 (loadReport가 period, currentDate를 의존하므로 자동으로 재로드됨)
  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  // 기간 변경
  const handlePreviousPeriod = () => {
    if (period === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNextPeriod = () => {
    if (period === 'week') {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setDate(prev.getDate() + 7);
        return next;
      });
    } else {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + 1);
        return next;
      });
    }
  };

  // 리포트 재생성 (개발 모드 전용)
  const handleRegenerateReport = async () => {
    Alert.alert(
      '리포트 재생성',
      '기존 리포트를 삭제하고 새로 생성합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '재생성',
          style: 'destructive',
          onPress: async () => {
            try {
              const year = currentDate.getFullYear();

              if (period === 'week') {
                const week = getISOWeek(currentDate);
                await apiService.deleteWeeklyReport(year, week);
              } else {
                const month = currentDate.getMonth() + 1;
                await apiService.deleteMonthlyReport(year, month);
              }

              // 삭제 후 다시 생성
              await handleGenerateReport();
            } catch (error) {
              logger.error('Error regenerating report:', error);
              Toast.show({
                type: 'error',
                text1: '오류',
                text2: '리포트 재생성에 실패했습니다',
                position: 'bottom',
                visibilityTime: 3000,
              });
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <ReportHeader onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기간 네비게이션 */}
        <PeriodNavigation
          periodText={periodText}
          onPrevious={handlePreviousPeriod}
          onNext={handleNextPeriod}
        />

        {/* 로딩 (초기 로드 또는 재생성 중) */}
        {(loading || isGenerating) && <LoadingView />}

        {/* 에러 또는 빈 상태 */}
        {!loading && !isGenerating && (error || !report) && (
          <ErrorStateRenderer
            error={error}
            canGenerate={canGenerate}
            diaryCount={diaryCount}
            period={period}
            isGenerating={isGenerating}
            onGenerate={handleGenerateReport}
          />
        )}

        {/* 리포트 표시 */}
        {!loading && !isGenerating && report && (
          <>
            {/* 경고 배너: 주간 리포트에서 3개 미만일 때 */}
            {period === 'week' && report.diaryCount < 3 && (
              <WarningBanner diaryCount={report.diaryCount} />
            )}

            {/* 요약 섹션 */}
            <ErrorBoundary level="component">
              <SummarySection
                report={report}
                period={period}
                dominantMoodInfo={dominantMoodInfo}
                onInfoPress={() => setShowInfoModal(true)}
              />
            </ErrorBoundary>

            {/* 감정 통계 */}
            <ErrorBoundary level="component">
              <MoodStatsCard report={report} previousReport={previousReport} />
            </ErrorBoundary>

            {/* 감정 키워드 순위 (AI 추출) */}
            <ErrorBoundary level="component">
              <KeywordTagsCard report={report} />
            </ErrorBoundary>

            {/* 리포트 안내 */}
            <InfoCard />

            {/* 개발 모드 전용: 리포트 재생성 버튼 */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.devButton}
                onPress={handleRegenerateReport}
              >
                <Text style={styles.devButtonText}>
                  🔄 리포트 재생성 (Dev Only)
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* 정보 모달 */}
      <InfoModal
        visible={showInfoModal}
        period={period}
        onClose={() => setShowInfoModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  devButton: {
    backgroundColor: '#FF6B6B',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5252',
    borderStyle: 'dashed',
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
