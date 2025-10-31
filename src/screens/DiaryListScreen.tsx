import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Calendar, DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DiaryEntry, StampType } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { DiaryStorage } from '../services/diaryStorage';
import { apiService } from '../services/apiService';
import { WeatherService } from '../services/weatherService';
import { getStampImage } from '../utils/stampUtils';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryList'>;

export const DiaryListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  const loadDiaries = useCallback(async () => {
    const entries = await DiaryStorage.getAll();

    // 서버에서 AI 코멘트 동기화
    for (const entry of entries) {
      if (!entry.aiComment) {
        try {
          const serverData = await apiService.syncDiaryFromServer(entry._id);
          if (serverData && serverData.aiComment) {
            // 로컬 스토리지 업데이트
            await DiaryStorage.update(entry._id, {
              aiComment: serverData.aiComment,
              stampType: serverData.stampType as StampType,
            });
          }
        } catch (error) {
          console.log('서버 동기화 오류 (무시):', error);
        }
      }
    }

    // 동기화 후 다시 로드
    const updatedEntries = await DiaryStorage.getAll();
    setDiaries(updatedEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDiaries();
    }, [loadDiaries])
  );

  // 캘린더에 표시할 날짜 마킹
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};

    diaries.forEach((diary) => {
      const dateKey = format(new Date(diary.date), 'yyyy-MM-dd');
      const isSelected = dateKey === selectedDate;
      const hasComment = !!diary.aiComment;

      marked[dateKey] = {
        customStyles: {
          container: {
            backgroundColor: isSelected ? '#4CAF50' : 'transparent',
            borderRadius: 16,
            position: 'relative',
          },
          text: {
            color: isSelected ? '#fff' : '#000',
            fontWeight: 'bold',
          },
        },
        marked: hasComment,
        dotColor: hasComment ? '#FFD700' : undefined,
      };
    });

    // 선택된 날짜가 일기가 없는 경우에도 표시
    if (!marked[selectedDate]) {
      marked[selectedDate] = {
        customStyles: {
          container: {
            backgroundColor: '#4CAF50',
            borderRadius: 16,
          },
          text: {
            color: '#fff',
            fontWeight: '300',
          },
        },
      };
    }

    return marked;
  }, [diaries, selectedDate]);

  // 선택된 날짜의 일기
  const selectedDiary = useMemo(() => {
    return diaries.find((diary) => {
      const diaryDate = format(new Date(diary.date), 'yyyy-MM-dd');
      return diaryDate === selectedDate;
    });
  }, [diaries, selectedDate]);

  const handleDateSelect = (date: DateData) => {
    setSelectedDate(date.dateString);
  };

  const handleWriteDiary = () => {
    if (selectedDiary) {
      navigation.navigate('DiaryDetail', { entryId: selectedDiary._id });
    } else {
      navigation.navigate('DiaryWrite', { date: new Date(selectedDate) });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>나의 일기장 📔</Text>
      </View>

      <Calendar
        markedDates={markedDates}
        onDayPress={handleDateSelect}
        markingType="custom"
        theme={{
          selectedDayBackgroundColor: '#4CAF50',
          todayTextColor: '#4CAF50',
          arrowColor: '#4CAF50',
          dotColor: '#4CAF50',
          textDayFontWeight: '300',
          textDayFontSize: 16,
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          'stylesheet.day.basic': {
            base: {
              width: 32,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
            },
            text: {
              marginTop: 6,
              fontSize: 16,
              fontWeight: '300',
              color: '#e0e0e0',
            },
          },
        }}
        style={styles.calendar}
      />

      <View style={styles.selectedDateSection}>
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
          <TouchableOpacity
            style={styles.writeButton}
            onPress={handleWriteDiary}
          >
            <Text style={styles.writeButtonText}>
              {selectedDiary ? '보기' : '작성하기'}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedDiary ? (
          <TouchableOpacity
            style={styles.selectedDiaryCard}
            onPress={() =>
              navigation.navigate('DiaryDetail', { entryId: selectedDiary._id })
            }
          >
            <View style={styles.cardContent}>
              <Text style={styles.diaryContentText} numberOfLines={3}>
                {selectedDiary.content}
              </Text>
              {selectedDiary.stampType && (
                <Image
                  source={getStampImage(selectedDiary.stampType)}
                  style={styles.stampImageLarge}
                  resizeMode="contain"
                />
              )}
            </View>
            {selectedDiary.aiComment && (
              <View style={styles.aiCommentPreview}>
                <Text style={styles.aiCommentLabel}>✨ 선생님 코멘트</Text>
                <Text style={styles.aiCommentPreviewText}>
                  {selectedDiary.aiComment}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.noDiaryContainer}>
            <Text style={styles.noDiaryText}>이 날의 일기가 없어요</Text>
            <Text style={styles.noDiarySubText}>새로운 일기를 작성해보세요!</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDateSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateWithWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weatherIconSmall: {
    fontSize: 20,
  },
  writeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  writeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDiaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  diaryContentText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  stampImageLarge: {
    width: 50,
    height: 50,
    marginLeft: 12,
  },
  aiCommentPreview: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
  },
  aiCommentLabel: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
    marginBottom: 4,
  },
  aiCommentPreviewText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
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
