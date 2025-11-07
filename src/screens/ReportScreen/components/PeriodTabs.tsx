import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../../constants/colors';

type ReportPeriod = 'week' | 'month';

interface PeriodTabsProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
}

export const PeriodTabs: React.FC<PeriodTabsProps> = ({ period, onPeriodChange }) => {
  return (
    <View style={styles.periodTabs}>
      <TouchableOpacity
        style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
        onPress={() => onPeriodChange('week')}
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
  );
};

const styles = StyleSheet.create({
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: COLORS.settingsIconColor,
  },
  periodTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  periodTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
