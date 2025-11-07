import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

interface PeriodNavigationProps {
  periodText: string;
  onPrevious: () => void;
  onNext: () => void;
}

export const PeriodNavigation: React.FC<PeriodNavigationProps> = ({
  periodText,
  onPrevious,
  onNext,
}) => {
  return (
    <View style={styles.periodNavigation}>
      <TouchableOpacity onPress={onPrevious} style={styles.periodArrow}>
        <Ionicons name="chevron-back" size={24} color={COLORS.buttonSecondaryBackground} />
      </TouchableOpacity>
      <Text style={styles.periodText}>{periodText}</Text>
      <TouchableOpacity onPress={onNext} style={styles.periodArrow}>
        <Ionicons name="chevron-forward" size={24} color={COLORS.buttonSecondaryBackground} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  periodNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  periodArrow: {
    padding: 8,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
