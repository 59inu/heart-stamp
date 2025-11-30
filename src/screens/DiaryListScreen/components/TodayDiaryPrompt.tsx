import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

interface TodayDiaryPromptProps {
  onPress: () => void;
}

export const TodayDiaryPrompt: React.FC<TodayDiaryPromptProps> = ({ onPress }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
        <MaterialCommunityIcons name="pencil-plus" size={18} color="#87A6D1" />
        <Text style={styles.buttonText}>오늘 일기 쓰기</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF2FA',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E2F5',
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#87A6D1',
  },
});
