import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

interface MoodStatsBarProps {
  moodStats: {
    red: number;
    yellow: number;
    green: number;
    total: number;
  };
  summaryText: string | null;
  stampCount: number;
  onStampPress?: () => void;
}

export const MoodStatsBar: React.FC<MoodStatsBarProps> = ({
  moodStats,
  summaryText,
  stampCount,
  onStampPress,
}) => {
  return (
    <View style={styles.moodStatsContainer}>
      <View style={styles.moodStatsBar}>
        {moodStats.total === 0 ? (
          <View style={[styles.moodStatsSegment, { backgroundColor: '#d0d0d0', flex: 1 }]} />
        ) : (
          <>
            {moodStats.red > 0 && (
              <View
                style={[
                  styles.moodStatsSegment,
                  styles.moodStatsRed,
                  {
                    flex: moodStats.red,
                  },
                ]}
              />
            )}
            {moodStats.yellow > 0 && (
              <View
                style={[
                  styles.moodStatsSegment,
                  styles.moodStatsYellow,
                  {
                    flex: moodStats.yellow,
                  },
                ]}
              />
            )}
            {moodStats.green > 0 && (
              <View
                style={[
                  styles.moodStatsSegment,
                  styles.moodStatsGreen,
                  {
                    flex: moodStats.green,
                  },
                ]}
              />
            )}
          </>
        )}
      </View>
      <Text style={styles.moodSummaryText}>
        {moodStats.total === 0 ? '이 달은 어떤 기분으로 채워갈까요' : summaryText}
      </Text>
      {stampCount > 0 && (
        <TouchableOpacity
          style={styles.stampCountContainer}
          onPress={onStampPress}
          activeOpacity={0.7}
        >
          <Text style={styles.stampCountText}>이번 달에 모은 도장 {stampCount}개</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  moodStatsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 14,
  },
  moodStatsBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  moodSummaryText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  moodStatsSegment: {
    height: '100%',
  },
  moodStatsRed: {
    backgroundColor: COLORS.emotionNegativeStrong,
  },
  moodStatsYellow: {
    backgroundColor: COLORS.emotionNeutralStrong,
  },
  moodStatsGreen: {
    backgroundColor: COLORS.emotionPositiveStrong,
  },
  stampCountContainer: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5EFE5', // 하트 베이지
    borderRadius: 12,
    alignSelf: 'center',
  },
  stampCountText: {
    fontSize: 13,
    color: '#6B5E4F', // 더 진한 베이지
    fontWeight: '600',
    textAlign: 'center',
  },
});
