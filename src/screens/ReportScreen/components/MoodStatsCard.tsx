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

  // 감정 데이터 정의
  type MoodType = 'red' | 'yellow' | 'green';

  const moodData: Array<{
    type: MoodType;
    name: string;
    count: number;
    percentage: number;
    barStyle: any;
    dotStyle: any;
  }> = [
    {
      type: 'red',
      name: '부정',
      count: report.moodDistribution.red,
      percentage: report.moodDistribution.percentages.red,
      barStyle: styles.moodBarRed,
      dotStyle: styles.moodDotRed,
    },
    {
      type: 'yellow',
      name: '중립',
      count: report.moodDistribution.yellow,
      percentage: report.moodDistribution.percentages.yellow,
      barStyle: styles.moodBarYellow,
      dotStyle: styles.moodDotYellow,
    },
    {
      type: 'green',
      name: '긍정',
      count: report.moodDistribution.green,
      percentage: report.moodDistribution.percentages.green,
      barStyle: styles.moodBarGreen,
      dotStyle: styles.moodDotGreen,
    },
  ];

  // 비율이 높은 순서대로 정렬
  const sortedMoods = [...moodData].sort((a, b) => b.percentage - a.percentage);

  // 변화 뱃지 렌더링 함수
  const renderChangeBadge = (mood: MoodType, currentPercentage: number) => {
    if (!previousReport || previousReport.moodDistribution.total === 0) return null;

    const prevPercentages = previousReport.moodDistribution.percentages;
    const diff = currentPercentage - prevPercentages[mood];

    if (Math.abs(diff) < 1) return null;

    let badgeStyle, textStyle;

    if (mood === 'red') {
      // 부정: 감소=좋음(초록), 증가=나쁨(빨강)
      const isGood = diff < 0;
      badgeStyle = isGood ? styles.moodChangeBadgeGood : styles.moodChangeBadgeBad;
      textStyle = isGood ? styles.moodChangeTextGood : styles.moodChangeTextBad;
    } else if (mood === 'green') {
      // 긍정: 증가=좋음(초록), 감소=나쁨(빨강)
      const isGood = diff > 0;
      badgeStyle = isGood ? styles.moodChangeBadgeGood : styles.moodChangeBadgeBad;
      textStyle = isGood ? styles.moodChangeTextGood : styles.moodChangeTextBad;
    } else {
      // 중립: 중립적 표시
      badgeStyle = styles.moodChangeBadgeNeutral;
      textStyle = styles.moodChangeTextNeutral;
    }

    return (
      <View style={[styles.moodChangeBadge, badgeStyle]}>
        <Text style={[styles.moodChangeText, textStyle]}>
          {diff > 0 ? '+' : ''}{Math.round(diff)}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.moodStatsCard}>
      <Text style={styles.cardTitle}>감정 분포</Text>

      {/* 막대 그래프 - 비율순으로 정렬 */}
      <View style={styles.moodBar}>
        {sortedMoods.map((mood) => mood.count > 0 && (
          <View
            key={mood.type}
            style={[
              styles.moodBarSegment,
              mood.barStyle,
              { flex: mood.count },
            ]}
          />
        ))}
      </View>

      {/* 통계 상세 - 비율순으로 정렬 */}
      <View style={styles.moodDetails}>
        {sortedMoods.map((mood) => (
          <View key={mood.type} style={styles.moodDetailItem}>
            <View style={[styles.moodDot, mood.dotStyle]} />
            <Text style={styles.moodDetailLabel}>{mood.name}</Text>
            <View style={styles.moodDetailValueContainer}>
              <Text style={styles.moodDetailValue}>
                {mood.count}회 ({mood.percentage}%)
              </Text>
              {renderChangeBadge(mood.type, mood.percentage)}
            </View>
          </View>
        ))}
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
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  moodBarSegment: {
    height: '100%',
  },
  moodBarRed: {
    backgroundColor: COLORS.emotionNegativeLight, // 하트 핑크
  },
  moodBarYellow: {
    backgroundColor: COLORS.emotionNeutralLight, // 하트 베이지
  },
  moodBarGreen: {
    backgroundColor: COLORS.emotionPositiveLight, // 하트 민트
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
    backgroundColor: COLORS.emotionNegativeStrong, // 하트 핑크
  },
  moodDotYellow: {
    backgroundColor: COLORS.emotionNeutralStrong, // 하트 베이지
  },
  moodDotGreen: {
    backgroundColor: COLORS.emotionPositiveStrong, // 하트 민트
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
