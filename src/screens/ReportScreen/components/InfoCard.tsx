import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

export const InfoCard: React.FC = () => {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#5F8A7A" />
        <Text style={styles.infoText}>
          한 번 생성된 리포트는 과거 일기가 수정되어도 업데이트되지 않습니다
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: COLORS.emotionPositiveLight, // 하트 민트 배경
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.emotionPositiveStrong, // 하트 민트
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#5F8A7A', // 진한 민트
    lineHeight: 18,
  },
});
