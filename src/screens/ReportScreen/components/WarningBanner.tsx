import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

interface WarningBannerProps {
  diaryCount: number;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ diaryCount }) => {
  return (
    <View style={styles.warningBanner}>
      <Text style={styles.warningIcon}>⚠️</Text>
      <View style={styles.warningContent}>
        <Text style={styles.warningTitle}>
          더 정확한 분석을 위해 주 3회 이상 일기를 작성해보세요
        </Text>
        <Text style={styles.warningSubtext}>
          현재 {diaryCount}개의 일기로 리포트를 생성했어요
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
