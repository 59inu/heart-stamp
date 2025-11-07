import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../../constants/colors';

type ReportPeriod = 'week' | 'month';

interface GenerateReportCardProps {
  period: ReportPeriod;
  diaryCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
}

export const GenerateReportCard: React.FC<GenerateReportCardProps> = ({
  period,
  diaryCount,
  isGenerating,
  onGenerate,
}) => {
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
        onPress={onGenerate}
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
};

const styles = StyleSheet.create({
  generateCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 40,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.buttonSecondaryBackground,
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
});
