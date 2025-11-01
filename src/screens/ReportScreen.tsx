import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  isFuture,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { RootStackParamList } from '../navigation/types';
import { Report } from '../models/Report';
import { apiService } from '../services/apiService';
import { getWeekNumber } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import { COLORS } from '../constants/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Report'>;

type ReportPeriod = 'week' | 'month';

export const ReportScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [report, setReport] = useState<Report | null>(null);
  const [previousReport, setPreviousReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diaryCount, setDiaryCount] = useState<number | undefined>();
  const [canGenerate, setCanGenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // 기간 계산
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

  // 기간이 완료되었는지 확인
  const isPeriodCompleted = useMemo(() => {
    return !isFuture(endDate);
  }, [endDate]);

  // 가장 변동폭이 큰 감정과 전주/전월 대비 변화율 계산
  const dominantMoodInfo = useMemo(() => {
    if (!report || report.moodDistribution.total === 0) return null;

    const percentages = report.moodDistribution.percentages;

    // 신호등 이름 매핑
    const moodNames = {
      red: '부정',
      yellow: '중립',
      green: '긍정',
    };

    // 이전 리포트가 있으면 상승폭이 가장 큰 감정 찾기
    if (previousReport && previousReport.moodDistribution.total > 0) {
      const prevPercentages = previousReport.moodDistribution.percentages;

      // 각 감정의 변화량 계산 (증가는 양수, 감소는 음수)
      const changes = {
        red: percentages.red - prevPercentages.red,
        yellow: percentages.yellow - prevPercentages.yellow,
        green: percentages.green - prevPercentages.green,
      };

      // 상승폭이 가장 큰 감정 찾기
      let maxIncreaseMood: 'red' | 'yellow' | 'green' = 'green';
      let maxIncrease = changes.green;

      if (changes.red > maxIncrease) {
        maxIncreaseMood = 'red';
        maxIncrease = changes.red;
      }
      if (changes.yellow > maxIncrease) {
        maxIncreaseMood = 'yellow';
        maxIncrease = changes.yellow;
      }

      const currentPercentage = percentages[maxIncreaseMood];
      const previousPercentage = prevPercentages[maxIncreaseMood];
      const diff = currentPercentage - previousPercentage;

      return {
        mood: maxIncreaseMood,
        name: moodNames[maxIncreaseMood],
        percentage: currentPercentage,
        change: Math.abs(diff) >= 1 ? {
          value: Math.abs(diff),
          isIncrease: diff > 0,
        } : null,
      };
    }

    // 이전 리포트가 없으면 가장 많은 감정 표시
    let dominantMood: 'red' | 'yellow' | 'green' = 'green';
    let dominantPercentage = percentages.green;

    if (percentages.red > dominantPercentage) {
      dominantMood = 'red';
      dominantPercentage = percentages.red;
    }
    if (percentages.yellow > dominantPercentage) {
      dominantMood = 'yellow';
      dominantPercentage = percentages.yellow;
    }

    return {
      mood: dominantMood,
      name: moodNames[dominantMood],
      percentage: dominantPercentage,
      change: null,
    };
  }, [report, previousReport]);

  // 리포트 로드
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

  // 화면 포커스 시 리포트 로드 (loadReport가 period, currentDate를 의존하므로 자동으로 재로드됨)
  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  // 기간 표시 텍스트
  const periodText = useMemo(() => {
    if (period === 'week') {
      return `${format(startDate, 'M월 d일', { locale: ko })} - ${format(endDate, 'M월 d일', { locale: ko })}`;
    } else {
      return format(currentDate, 'yyyy년 M월', { locale: ko });
    }
  }, [period, startDate, endDate, currentDate]);

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

  // 리포트 생성
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

  // 에러 메시지 렌더링
  const renderErrorMessage = () => {
    if (error === 'not_completed') {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>⏰</Text>
          <Text style={styles.emptyMessage}>
            아직 리포트가 준비되지 않았어요
          </Text>
          <Text style={styles.emptySubtext}>
            {period === 'week' ? '주가 끝나면' : '달이 끝나면'} 리포트를 생성해드릴게요
          </Text>
        </View>
      );
    }

    // 리포트 생성 가능한 경우
    if (canGenerate && error === 'Report not found') {
      return (
        <View style={styles.generateCard}>
          <Text style={styles.generateEmoji}>✨</Text>
          <Text style={styles.generateTitle}>리포트 생성이 준비되었어요!</Text>
          <Text style={styles.generateMessage}>
            이번 {period === 'week' ? '주' : '달'}에 {diaryCount}개의 일기를 작성했어요
          </Text>
          <Text style={styles.generateInfo}>
            💡 한 번 생성된 리포트는 과거 일기가 수정되어도{'\n'}업데이트되지 않습니다
          </Text>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>리포트 생성하기</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // 일기 부족
    if (error && (error.includes('No diaries found') || error === 'Report not found')) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>📝</Text>
          <Text style={styles.emptyMessage}>
            리포트 생성을 위해 최소 3개의 일기가 필요해요
          </Text>
          <Text style={styles.emptySubtext}>
            현재 {diaryCount || 0}개 작성했어요
          </Text>
        </View>
      );
    }

    // "Week not completed yet" 처리
    if (error && error.includes('not completed yet')) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>⏰</Text>
          <Text style={styles.emptyMessage}>
            아직 리포트가 준비되지 않았어요
          </Text>
          <Text style={styles.emptySubtext}>
            {period === 'week' ? '주가 끝나면' : '달이 끝나면'} 리포트를 생성할 수 있어요
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>😔</Text>
          <Text style={styles.emptyMessage}>
            리포트를 불러올 수 없어요
          </Text>
          <Text style={styles.emptySubtext}>
            에러: {error}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>감정 리포트</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기간 선택 탭 */}
        <View style={styles.periodTabs}>
          <TouchableOpacity
            style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.periodTabText, period === 'week' && styles.periodTabTextActive]}>
              주간
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
            onPress={() => {
              Alert.alert('월간 리포트', '월간 리포트는 준비 중입니다.');
            }}
          >
            <Text style={[styles.periodTabText, period === 'month' && styles.periodTabTextActive]}>
              월간
            </Text>
          </TouchableOpacity>
        </View>

        {/* 기간 네비게이션 */}
        <View style={styles.periodNavigation}>
          <TouchableOpacity onPress={handlePreviousPeriod} style={styles.periodArrow}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.periodText}>{periodText}</Text>
          <TouchableOpacity onPress={handleNextPeriod} style={styles.periodArrow}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* 로딩 */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>리포트 생성 중...</Text>
          </View>
        )}

        {/* 에러 또는 빈 상태 */}
        {!loading && (error || !report) && renderErrorMessage()}

        {/* 리포트 표시 */}
        {!loading && report && (
          <>
            {/* 경고 배너: 주간 리포트에서 3개 미만일 때 */}
            {period === 'week' && report.diaryCount < 3 && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>
                    더 정확한 분석을 위해 주 3회 이상 일기를 작성해보세요
                  </Text>
                  <Text style={styles.warningSubtext}>
                    현재 {report.diaryCount}개의 일기로 리포트를 생성했어요
                  </Text>
                </View>
              </View>
            )}

            {/* 요약 섹션 */}
            <View style={styles.summarySection}>
              <View style={styles.summaryTitleRow}>
                <View style={styles.summaryTitleWithIcon}>
                  <Text style={styles.summaryTitle}>
                    🗓 {period === 'week' ? '주간' : '월간'} 심리 리포트
                  </Text>
                  <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.infoIconButton}>
                    <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 기분 밸런스 */}
              {dominantMoodInfo && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>기분 밸런스</Text>
                  <View style={styles.summaryValueContainer}>
                    <Text
                      style={[
                        styles.summaryValue,
                        dominantMoodInfo.mood === 'green' && styles.summaryValueGreen,
                        dominantMoodInfo.mood === 'yellow' && styles.summaryValueYellow,
                        dominantMoodInfo.mood === 'red' && styles.summaryValueRed,
                      ]}
                    >
                      {dominantMoodInfo.name} {dominantMoodInfo.percentage}%
                    </Text>
                    {dominantMoodInfo.change && (
                      <View
                        style={[
                          styles.summaryChangeBadge,
                          dominantMoodInfo.change.isIncrease ? styles.summaryChangeBadgePositive : styles.summaryChangeBadgeNegative,
                        ]}
                      >
                        <Text
                          style={[
                            styles.summaryChangeText,
                            dominantMoodInfo.change.isIncrease ? styles.summaryChangeTextPositive : styles.summaryChangeTextNegative,
                          ]}
                        >
                          {dominantMoodInfo.change.isIncrease ? '+' : '-'}
                          {Math.round(dominantMoodInfo.change.value)}%{dominantMoodInfo.change.isIncrease ? '↑' : '↓'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* 주요 키워드 */}
              {report.keywords && report.keywords.length > 0 && (
                <View style={[styles.summaryItem, styles.summaryItemLast]}>
                  <Text style={styles.summaryLabel}>주요 키워드</Text>
                  <Text style={styles.summaryKeywords}>
                    {report.keywords.slice(0, 3).map(k => k.keyword).join(' / ')}
                  </Text>
                </View>
              )}

              {/* AI 인사이트 */}
              {report.insight && (
                <View style={styles.summaryAiText}>
                  <Text style={styles.summaryAiInsight}>
                    💭 {report.insight}
                  </Text>
                </View>
              )}
            </View>

            {/* 작성한 일기 수 */}
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>작성한 일기</Text>
                <Text style={styles.statsCount}>{report.diaryCount}개</Text>
              </View>
            </View>

            {/* 감정 통계 */}
            {report.moodDistribution.total > 0 && (
              <View style={styles.moodStatsCard}>
                <Text style={styles.cardTitle}>감정 분포</Text>

                {/* 막대 그래프 */}
                <View style={styles.moodBar}>
                  {report.moodDistribution.red > 0 && (
                    <View
                      style={[
                        styles.moodBarSegment,
                        styles.moodBarRed,
                        { flex: report.moodDistribution.red },
                      ]}
                    />
                  )}
                  {report.moodDistribution.yellow > 0 && (
                    <View
                      style={[
                        styles.moodBarSegment,
                        styles.moodBarYellow,
                        { flex: report.moodDistribution.yellow },
                      ]}
                    />
                  )}
                  {report.moodDistribution.green > 0 && (
                    <View
                      style={[
                        styles.moodBarSegment,
                        styles.moodBarGreen,
                        { flex: report.moodDistribution.green },
                      ]}
                    />
                  )}
                </View>

                {/* 통계 상세 */}
                <View style={styles.moodDetails}>
                  <View style={styles.moodDetailItem}>
                    <View style={[styles.moodDot, styles.moodDotRed]} />
                    <Text style={styles.moodDetailLabel}>부정</Text>
                    <View style={styles.moodDetailValueContainer}>
                      <Text style={styles.moodDetailValue}>
                        {report.moodDistribution.red}회 ({report.moodDistribution.percentages.red}%)
                      </Text>
                      {previousReport && previousReport.moodDistribution.total > 0 && (() => {
                        const diff = report.moodDistribution.percentages.red - previousReport.moodDistribution.percentages.red;
                        if (Math.abs(diff) >= 1) {
                          // 힘듦(red): 증가=나쁨(빨강), 감소=좋음(초록)
                          const isGood = diff < 0;
                          return (
                            <View style={[styles.moodChangeBadge, isGood ? styles.moodChangeBadgeGood : styles.moodChangeBadgeBad]}>
                              <Text style={[styles.moodChangeText, isGood ? styles.moodChangeTextGood : styles.moodChangeTextBad]}>
                                {diff > 0 ? '+' : ''}{Math.round(diff)}%
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  </View>
                  <View style={styles.moodDetailItem}>
                    <View style={[styles.moodDot, styles.moodDotYellow]} />
                    <Text style={styles.moodDetailLabel}>중립</Text>
                    <View style={styles.moodDetailValueContainer}>
                      <Text style={styles.moodDetailValue}>
                        {report.moodDistribution.yellow}회 ({report.moodDistribution.percentages.yellow}%)
                      </Text>
                      {previousReport && previousReport.moodDistribution.total > 0 && (() => {
                        const diff = report.moodDistribution.percentages.yellow - previousReport.moodDistribution.percentages.yellow;
                        if (Math.abs(diff) >= 1) {
                          // 평온(yellow): 중립적이므로 단순 표시
                          return (
                            <View style={[styles.moodChangeBadge, styles.moodChangeBadgeNeutral]}>
                              <Text style={[styles.moodChangeText, styles.moodChangeTextNeutral]}>
                                {diff > 0 ? '+' : ''}{Math.round(diff)}%
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  </View>
                  <View style={styles.moodDetailItem}>
                    <View style={[styles.moodDot, styles.moodDotGreen]} />
                    <Text style={styles.moodDetailLabel}>긍정</Text>
                    <View style={styles.moodDetailValueContainer}>
                      <Text style={styles.moodDetailValue}>
                        {report.moodDistribution.green}회 ({report.moodDistribution.percentages.green}%)
                      </Text>
                      {previousReport && previousReport.moodDistribution.total > 0 && (() => {
                        const diff = report.moodDistribution.percentages.green - previousReport.moodDistribution.percentages.green;
                        if (Math.abs(diff) >= 1) {
                          // 행복(green): 증가=좋음(초록), 감소=나쁨(빨강)
                          const isGood = diff > 0;
                          return (
                            <View style={[styles.moodChangeBadge, isGood ? styles.moodChangeBadgeGood : styles.moodChangeBadgeBad]}>
                              <Text style={[styles.moodChangeText, isGood ? styles.moodChangeTextGood : styles.moodChangeTextBad]}>
                                {diff > 0 ? '+' : ''}{Math.round(diff)}%
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 감정 키워드 순위 (AI 추출) */}
            {report.keywords && report.keywords.length > 0 && (
              <View style={styles.tagsCard}>
                <Text style={styles.cardTitle}>주요 감정 키워드</Text>
                <View style={styles.tagsList}>
                  {report.keywords.map((item, index) => (
                    <View
                      key={item.keyword}
                      style={[
                        styles.tagItem,
                        index < 3 && styles.tagItemTop3,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagRank,
                          index < 3 && styles.tagRankTop3,
                        ]}
                      >
                        {index + 1}
                      </Text>
                      <Text
                        style={[
                          styles.tagText,
                          index < 3 && styles.tagTextTop3,
                        ]}
                      >
                        {item.keyword}
                      </Text>
                      <Text
                        style={[
                          styles.tagCount,
                          index < 3 && styles.tagCountTop3,
                        ]}
                      >
                        {item.count}회
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 리포트 안내 */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.infoText}>
                  한 번 생성된 리포트는 과거 일기가 수정되어도 업데이트되지 않습니다
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* 정보 모달 */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>리포트 항목 설명</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalItem}>
                <Text style={styles.modalItemTitle}>📊 기분 밸런스</Text>
                <Text style={styles.modalItemText}>
                  전{period === 'week' ? '주' : '월'} 대비 가장 상승한 감정 무드를 보여줍니다
                </Text>
              </View>

              <View style={styles.modalItem}>
                <Text style={styles.modalItemTitle}>🔑 주요 키워드</Text>
                <Text style={styles.modalItemText}>
                  일기에서 반복해 등장하거나 감정에 영향을 준 주요 키워드를 의미합니다
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: COLORS.primary,
  },
  periodTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  periodTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  periodNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  periodArrow: {
    padding: 8,
  },
  periodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666',
  },
  summarySection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitleRow: {
    marginBottom: 16,
  },
  summaryTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  infoIconButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryItemLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  summaryValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summaryValueGreen: {
    color: COLORS.emotionPositive,
  },
  summaryValueYellow: {
    color: COLORS.emotionNeutral,
  },
  summaryValueRed: {
    color: COLORS.emotionNegative,
  },
  summaryChangeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  summaryChangeBadgePositive: {
    backgroundColor: COLORS.emotionPositiveLight,
  },
  summaryChangeBadgeNegative: {
    backgroundColor: COLORS.emotionNegativeLight,
  },
  summaryChangeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryChangeTextPositive: {
    color: COLORS.emotionPositive,
  },
  summaryChangeTextNegative: {
    color: COLORS.emotionNegative,
  },
  summaryKeywords: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  summaryAiText: {
    marginTop: 4,
  },
  summaryAiSummary: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 6,
  },
  summaryAiInsight: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff9e6',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.emotionNeutral,
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.emotionNeutral,
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 13,
    color: COLORS.emotionNeutral,
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statsCount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.emotionPositive,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#666',
  },
  moodStatsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  moodBar: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  moodBarSegment: {
    height: '100%',
  },
  moodBarRed: {
    backgroundColor: COLORS.emotionNegativeLight,
  },
  moodBarYellow: {
    backgroundColor: COLORS.emotionNeutralLight,
  },
  moodBarGreen: {
    backgroundColor: COLORS.emotionPositiveLight,
  },
  moodDetails: {
    gap: 12,
  },
  moodDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodDetailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moodChangeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  moodChangeBadgeGood: {
    backgroundColor: COLORS.emotionPositiveLight,
  },
  moodChangeBadgeBad: {
    backgroundColor: COLORS.emotionNegativeLight,
  },
  moodChangeBadgeNeutral: {
    backgroundColor: COLORS.emotionNeutralLight,
  },
  moodChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moodChangeTextGood: {
    color: COLORS.emotionPositive,
  },
  moodChangeTextBad: {
    color: COLORS.emotionNegative,
  },
  moodChangeTextNeutral: {
    color: COLORS.emotionNeutral,
  },
  moodDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  moodDotRed: {
    backgroundColor: COLORS.emotionNegativeLight,
  },
  moodDotYellow: {
    backgroundColor: COLORS.emotionNeutralLight,
  },
  moodDotGreen: {
    backgroundColor: COLORS.emotionPositiveLight,
  },
  moodDetailLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  moodDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  keywordSummaryCard: {
    backgroundColor: '#fff9e6',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.emotionNeutral,
  },
  keywordSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.emotionNeutral,
    marginBottom: 12,
  },
  keywordSummaryText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  keywordInsightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tagsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  tagsList: {
    gap: 12,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tagItemTop3: {
    backgroundColor: '#fffaed',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  tagRank: {
    width: 24,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.emotionPositive,
    marginRight: 12,
  },
  tagRankTop3: {
    fontSize: 18,
    color: COLORS.emotionNeutral,
  },
  tagText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  tagTextTop3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tagCount: {
    fontSize: 13,
    color: '#999',
    marginLeft: 12,
  },
  tagCountTop3: {
    fontSize: 14,
    color: '#999',
  },
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 40,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  generateCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 40,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  generateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  generateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  generateMessage: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  generateInfo: {
    fontSize: 13,
    color: COLORS.emotionPositive,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  generateButton: {
    backgroundColor: COLORS.emotionPositive,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#f0f7f0',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.emotionPositive,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.emotionPositive,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 20,
    gap: 20,
  },
  modalItem: {
    gap: 8,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalItemText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
