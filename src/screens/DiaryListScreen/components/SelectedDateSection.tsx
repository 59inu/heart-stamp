import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DiaryEntry } from '../../../models/DiaryEntry';
import { WeatherService } from '../../../services/weatherService';
import { DiaryCard } from './DiaryCard';
import { COLORS } from '../../../constants/colors';

interface SelectedDateSectionProps {
  selectedDate: string;
  today: string;
  selectedDiary: DiaryEntry | undefined;
  onWriteDiary: () => void;
  onDiaryPress: () => void;
}

export const SelectedDateSection: React.FC<SelectedDateSectionProps> = ({
  selectedDate,
  today,
  selectedDiary,
  onWriteDiary,
  onDiaryPress,
}) => {
  return (
    <View style={styles.selectedDateSection}>
      {selectedDate <= today && (
        <View style={styles.selectedDateHeader}>
          <View style={styles.dateWithWeather}>
            <Text style={styles.selectedDateText}>
              {format(new Date(selectedDate), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
            </Text>
            {selectedDiary?.weather && (
              <Text style={styles.weatherIconSmall}>
                {WeatherService.getWeatherEmoji(selectedDiary.weather)}
              </Text>
            )}
          </View>
          {!selectedDiary && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={onWriteDiary}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {selectedDiary ? (
        <DiaryCard diary={selectedDiary} onPress={onDiaryPress} />
      ) : (
        <View style={styles.noDiaryContainer}>
          <Text style={styles.noDiaryText}>
            {selectedDate > today
              ? '아직 오지 않은 미래에요'
              : selectedDate === today
              ? '오늘의 일기를 작성하세요'
              : '이 날의 일기가 없어요'}
          </Text>
          <Text style={styles.noDiarySubText}>
            {selectedDate > today
              ? '기대하며 기다려볼까요 ✨'
              : selectedDate === today
              ? '선생님이 기다리고 있어요'
              : '기억을 기록해주세요'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  selectedDateSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    minHeight: 40,
  },
  dateWithWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  weatherIconSmall: {
    fontSize: 20,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.buttonSecondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noDiaryContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  noDiaryText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  noDiarySubText: {
    fontSize: 14,
    color: '#999',
  },
});
