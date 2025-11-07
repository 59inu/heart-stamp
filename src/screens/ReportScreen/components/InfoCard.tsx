import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

export const InfoCard: React.FC = () => {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.emotionPositive} />
        <Text style={styles.infoText}>
          한 번 생성된 리포트는 과거 일기가 수정되어도 업데이트되지 않습니다
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
