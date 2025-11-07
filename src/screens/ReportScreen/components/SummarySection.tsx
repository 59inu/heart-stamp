import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Report } from '../../../models/Report';
import { COLORS } from '../../../constants/colors';

type ReportPeriod = 'week' | 'month';

interface DominantMoodInfo {
  mood: 'red' | 'yellow' | 'green';
  name: string;
  percentage: number;
  change: {
    value: number;
    isIncrease: boolean;
  } | null;
}

interface SummarySectionProps {
  report: Report;
  period: ReportPeriod;
  dominantMoodInfo: DominantMoodInfo | null;
  onInfoPress: () => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  report,
  period,
  dominantMoodInfo,
  onInfoPress,
}) => {
  return (
    <View style={styles.summarySection}>
      <View style={styles.summaryTitleRow}>
        <View style={styles.summaryTitleWithIcon}>
          <Text style={styles.summaryTitle}>
            🗓 {period === 'week' ? '주간' : '월간'} 심리 리포트
          </Text>
          <TouchableOpacity onPress={onInfoPress} style={styles.infoIconButton}>
            <MaterialCommunityIcons name="information" size={22} color={COLORS.settingsIconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 일기 쓴 날 */}
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>일기 쓴 날</Text>
        <Text style={styles.summaryValueGreen}>{report.diaryCount}일</Text>
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
  );
};

const styles = StyleSheet.create({
  summarySection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: COLORS.buttonSecondaryBackground,
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
    gap: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  infoIconButton: {
    borderRadius: 12,
    padding: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryValueGreen: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryValueYellow: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryValueRed: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    marginTop: 12,
  },
  summaryAiInsight: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    fontStyle: 'italic',
  },
});
