import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Report } from '../../../models/Report';
import { COLORS } from '../../../constants/colors';

interface MoodStatsCardProps {
  report: Report;
  previousReport: Report | null;
}

export const MoodStatsCard: React.FC<MoodStatsCardProps> = ({ report, previousReport }) => {
  if (report.moodDistribution.total === 0) {
    return null;
  }

  return (
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
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#F7B5AA',
  },
  moodBarYellow: {
    backgroundColor: '#F5F0C0',
  },
  moodBarGreen: {
    backgroundColor: '#D0FADD',
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
    backgroundColor: '#F7B5AA',
  },
  moodDotYellow: {
    backgroundColor: '#F5F0C0',
  },
  moodDotGreen: {
    backgroundColor: '#D0FADD',
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
});
