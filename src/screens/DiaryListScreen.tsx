import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Calendar, DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { DiaryEntry, StampType } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { DiaryStorage } from '../services/diaryStorage';
import { apiService } from '../services/apiService';
import { WeatherService } from '../services/weatherService';
import { getStampImage } from '../utils/stampUtils';
import { OnboardingService } from '../services/onboardingService';
import { FirstVisitGuide } from '../components/FirstVisitGuide';
import { logger } from '../utils/logger';
import { CALENDAR_MARKING_STYLES } from '../constants/calendarStyles';
import { COLORS } from '../constants/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryList'>;

export const DiaryListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 오늘 날짜를 한 번만 계산 (성능 최적화)
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const loadDiaries = useCallback(async () => {
    let entries = await DiaryStorage.getAll();

    // 로컬에 일기가 없으면 서버에서 전체 가져오기
    if (entries.length === 0) {
      try {
        const serverDiaries = await apiService.getAllDiaries();
        logger.log(`📥 서버에서 ${serverDiaries.length}개 일기 가져오기`);

        for (const diary of serverDiaries) {
          await DiaryStorage.saveFromServer(diary);
        }

        entries = await DiaryStorage.getAll();
      } catch (error) {
        logger.error('서버에서 일기 가져오기 실패:', error);
      }
    }

    // 서버에서 AI 코멘트 동기화 - 병렬 처리로 성능 개선 (N+1 쿼리 패턴 제거)
    try {
      const syncPromises = entries.map(async (entry) => {
        try {
          const serverData = await apiService.syncDiaryFromServer(entry._id);
          if (serverData && serverData.aiComment) {
            return {
              id: entry._id,
              updates: {
                aiComment: serverData.aiComment,
                stampType: serverData.stampType as StampType,
              },
            };
          }
          return null;
        } catch (error) {
          logger.debug(`서버 동기화 오류 (${entry._id}):`, error);
          return null;
        }
      });

      const results = await Promise.all(syncPromises);

      // Batch update all entries
      for (const result of results) {
        if (result) {
          await DiaryStorage.update(result.id, result.updates);
        }
      }
    } catch (error) {
      logger.error('동기화 중 오류:', error);
    }

    // 동기화 후 다시 로드
    const updatedEntries = await DiaryStorage.getAll();
    setDiaries(updatedEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDiaries();

      // 첫 방문 온보딩 체크
      const checkOnboarding = async () => {
        const completed = await OnboardingService.hasCompletedOnboarding();
        if (!completed) {
          setShowOnboarding(true);
        }
      };
      checkOnboarding();
    }, [loadDiaries])
  );

  const handleOnboardingComplete = useCallback(async () => {
    await OnboardingService.markOnboardingCompleted();
    setShowOnboarding(false);
  }, []);

  // 캘린더에 표시할 날짜 마킹 (인라인 객체 생성 최적화)
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};

    diaries.forEach((diary) => {
      const dateKey = format(new Date(diary.date), 'yyyy-MM-dd');
      const isSelected = dateKey === selectedDate;
      const hasComment = !!diary.aiComment;

      // 선택된 날짜
      if (isSelected) {
        marked[dateKey] = hasComment
          ? CALENDAR_MARKING_STYLES.selectedWithComment
          : CALENDAR_MARKING_STYLES.selectedWithoutComment;
      }
      // AI 코멘트 있는 날짜 - 피치색 배경
      else if (hasComment) {
        marked[dateKey] = CALENDAR_MARKING_STYLES.withComment;
      }
      // 일반 일기 있는 날짜 - 볼드체만
      else {
        marked[dateKey] = CALENDAR_MARKING_STYLES.withDiary;
      }
    });

    // 미래 날짜들을 연한 색으로 마킹 (시각적으로 비활성화 표현)
    const nowDate = new Date();
    const currentMonth = nowDate.getMonth();
    const currentYear = nowDate.getFullYear();

    // 이전 달부터 다음다음 달까지의 모든 날짜 확인
    for (let monthOffset = -1; monthOffset <= 2; monthOffset++) {
      const checkDate = new Date(currentYear, currentMonth + monthOffset, 1);
      const daysInMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(checkDate.getFullYear(), checkDate.getMonth(), day);
        const dateKey = format(date, 'yyyy-MM-dd');

        // 미래 날짜이고, 아직 마킹되지 않았으면 (일기가 없으면)
        if (dateKey > today && !marked[dateKey]) {
          marked[dateKey] = CALENDAR_MARKING_STYLES.futureDate;
        }
      }
    }

    // 선택된 날짜가 일기가 없는 경우에도 표시
    if (!marked[selectedDate]) {
      marked[selectedDate] = CALENDAR_MARKING_STYLES.selectedEmpty;
    }

    return marked;
  }, [diaries, selectedDate, today]);

  // 선택된 날짜의 일기
  const selectedDiary = useMemo(() => {
    return diaries.find((diary) => {
      const diaryDate = format(new Date(diary.date), 'yyyy-MM-dd');
      return diaryDate === selectedDate;
    });
  }, [diaries, selectedDate]);

  // 현재 월의 신호등 통계
  const currentMonthMoodStats = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // 현재 월의 일기들만 필터링
    const monthDiaries = diaries.filter((diary) => {
      const diaryDate = new Date(diary.date);
      return (
        diaryDate.getFullYear() === currentYear &&
        diaryDate.getMonth() === currentMonth &&
        diary.mood // 신호등이 있는 일기만
      );
    });

    const total = monthDiaries.length;
    if (total === 0) {
      return { red: 0, yellow: 0, green: 0, total: 0 };
    }

    const red = monthDiaries.filter((d) => d.mood === 'red').length;
    const yellow = monthDiaries.filter((d) => d.mood === 'yellow').length;
    const green = monthDiaries.filter((d) => d.mood === 'green').length;

    return { red, yellow, green, total };
  }, [diaries, currentDate]);

  // 이달의 감정 요약 문구
  const moodSummaryText = useMemo(() => {
    const { red, yellow, green, total } = currentMonthMoodStats;
    if (total === 0) return null;

    // 모두 같은 경우 (다채로운 감정)
    if (red === yellow && yellow === green) {
      return '다채로운 감정들과 함께하고 있네요. 응원해요 💪';
    }

    const max = Math.max(red, yellow, green);

    if (green === max) {
      return '이번 달은 행복한 날이 가장 많았어요 ✨';
    } else if (red === max) {
      return '이번 달은 힘든 날이 많았네요. 안아주고 싶어요 🫂';
    } else {
      return '이번 달은 조금 우울한 날이 많았어요. 괜찮아요 🌙';
    }
  }, [currentMonthMoodStats]);

  // 오늘 일기 작성 여부
  const hasTodayDiary = useMemo(() => {
    return diaries.some((diary) => {
      const diaryDate = format(new Date(diary.date), 'yyyy-MM-dd');
      return diaryDate === today;
    });
  }, [diaries, today]);

  const handleDateSelect = useCallback((date: DateData) => {
    setSelectedDate(date.dateString);
  }, []);

  const handleWriteDiary = useCallback(() => {
    if (selectedDiary) {
      navigation.navigate('DiaryDetail', { entryId: selectedDiary._id });
    } else {
      navigation.navigate('DiaryWrite', { date: new Date(selectedDate) });
    }
  }, [selectedDiary, selectedDate, navigation]);

  const handleMonthSelect = useCallback((month: number) => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setMonth(month);
      return newDate;
    });
    setShowMonthPicker(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowMonthPicker(false);
  }, []);

  const handleYearChange = useCallback((delta: number) => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setFullYear(prevDate.getFullYear() + delta);
      return newDate;
    });
  }, []);

  const renderMonthYearPicker = () => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    return (
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => handleYearChange(-1)}
                style={styles.yearArrowButton}
              >
                <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>{currentYear}년</Text>

              <TouchableOpacity
                onPress={() => handleYearChange(1)}
                style={styles.yearArrowButton}
              >
                <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerGrid}>
              {months.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pickerItem,
                    index === currentMonth && styles.pickerItemSelected,
                  ]}
                  onPress={() => handleMonthSelect(index)}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      index === currentMonth && styles.pickerItemTextSelected,
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings" size={26} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Report')}
        >
          <Ionicons name="stats-chart" size={26} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderMonthYearPicker()}

      {/* 이달의 신호등 통계 막대 */}
      {currentMonthMoodStats.total > 0 && (
        <View style={styles.moodStatsContainer}>
          <View style={styles.moodStatsBar}>
            {currentMonthMoodStats.red > 0 && (
              <View
                style={[
                  styles.moodStatsSegment,
                  styles.moodStatsRed,
                  {
                    flex: currentMonthMoodStats.red,
                  },
                ]}
              />
            )}
            {currentMonthMoodStats.yellow > 0 && (
              <View
                style={[
                  styles.moodStatsSegment,
                  styles.moodStatsYellow,
                  {
                    flex: currentMonthMoodStats.yellow,
                  },
                ]}
              />
            )}
            {currentMonthMoodStats.green > 0 && (
              <View
                style={[
                  styles.moodStatsSegment,
                  styles.moodStatsGreen,
                  {
                    flex: currentMonthMoodStats.green,
                  },
                ]}
              />
            )}
          </View>
          {moodSummaryText && (
            <Text style={styles.moodSummaryText}>{moodSummaryText}</Text>
          )}
        </View>
      )}

      <Calendar
        current={format(currentDate, 'yyyy-MM-dd')}
        markedDates={markedDates}
        onDayPress={handleDateSelect}
        onMonthChange={(date: DateData) => {
          setCurrentDate(new Date(date.year, date.month - 1, 1));
        }}
        markingType="custom"
        renderHeader={(date: any) => {
          const monthYear = format(new Date(date), 'yyyy년 MM월', { locale: ko });
          return (
            <TouchableOpacity
              style={styles.calendarHeader}
              onPress={() => setShowMonthPicker(true)}
            >
              <Text style={styles.calendarHeaderText}>{monthYear}</Text>
            </TouchableOpacity>
          );
        }}
        theme={{
          selectedDayBackgroundColor: COLORS.primary,
          todayTextColor: COLORS.primary,
          arrowColor: COLORS.primary,
          dotColor: COLORS.primary,
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
              color: '#bbb',
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
          {selectedDate <= today && (
            <TouchableOpacity
              style={styles.writeButton}
              onPress={handleWriteDiary}
            >
              <Text style={styles.writeButtonText}>
                {selectedDiary ? '보기' : '작성하기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedDiary ? (
          <TouchableOpacity
            style={styles.selectedDiaryCard}
            onPress={() =>
              navigation.navigate('DiaryDetail', { entryId: selectedDiary._id })
            }
          >
            {selectedDiary.stampType && (
              <Image
                source={getStampImage(selectedDiary.stampType)}
                style={styles.stampImageLarge}
                resizeMode="contain"
              />
            )}
            <View style={styles.cardContent}>
              {selectedDiary.mood && (
                <View style={styles.moodIndicatorContainer}>
                  <View
                    style={[
                      styles.moodIndicator,
                      selectedDiary.mood === 'red' && styles.moodRed,
                      selectedDiary.mood === 'yellow' && styles.moodYellow,
                      selectedDiary.mood === 'green' && styles.moodGreen,
                    ]}
                  />
                  {selectedDiary.moodTag && (
                    <Text style={styles.moodTagText}>{selectedDiary.moodTag}</Text>
                  )}
                </View>
              )}
              <Text style={styles.diaryContentText} numberOfLines={3} ellipsizeMode="tail">
                {selectedDiary.content.replace(/\n/g, ' ')}
              </Text>
            </View>
            {selectedDiary.aiComment ? (
              <View style={styles.aiCommentPreview}>
                <Text style={styles.aiCommentLabel}>✨ 선생님 코멘트</Text>
                <Text style={styles.aiCommentPreviewText}>
                  {selectedDiary.aiComment}
                </Text>
              </View>
            ) : (() => {
              // 일기 날짜와 현재 날짜 비교
              const entryDate = new Date(selectedDiary.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              entryDate.setHours(0, 0, 0, 0);

              const isToday = entryDate.getTime() === today.getTime();

              // 오늘 일기만 대기 메시지 표시
              if (isToday) {
                return (
                  <View style={styles.noAiCommentPreview}>
                    <Text style={styles.noAiCommentPreviewText}>
                      선생님이 일기를 읽고 있어요📖
                    </Text>
                  </View>
                );
              }

              return null;
            })()}
          </TouchableOpacity>
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
                ? '기대하며 기다려볼까요'
                : selectedDate === today
                ? '선생님이 기다리고 있어요'
                : '기억을 기록해주세요'}
            </Text>
          </View>
        )}
      </View>
      </ScrollView>

      {/* 빠른 작성 버튼 - 오늘 일기가 없을 때만 표시 */}
      {!hasTodayDiary && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate('DiaryWrite', { date: new Date() })}
        >
          <Ionicons name="create" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* 첫 방문 온보딩 */}
      <FirstVisitGuide
        visible={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
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
    padding: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  calendar: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDateSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 40,
  },
  dateWithWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  weatherIconSmall: {
    fontSize: 20,
  },
  writeButton: {
    backgroundColor: COLORS.primary,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    // iOS 그림자
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android 그림자
    elevation: 5,
  },
  stampImageLarge: {
    width: 125,
    height: 125,
    position: 'absolute',
    top: 30,
    right: -10,
    opacity: 0.85,
    zIndex: 1,
  },
  cardContent: {
    marginBottom: 12,
  },
  diaryContentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  aiCommentPreview: {
    backgroundColor: COLORS.secondaryLight,
    padding: 12,
    borderRadius: 8,
  },
  aiCommentLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiCommentPreviewText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  noAiCommentPreview: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  noAiCommentPreviewText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  moodIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  moodIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  moodRed: {
    backgroundColor: COLORS.emotionNegativeLight,
  },
  moodYellow: {
    backgroundColor: COLORS.emotionNeutralLight,
  },
  moodGreen: {
    backgroundColor: COLORS.emotionPositiveLight,
  },
  moodTagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  calendarHeaderText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    height: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  pickerItem: {
    width: '30%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemSelected: {
    backgroundColor: COLORS.primary,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  yearArrowButton: {
    padding: 8,
  },
  moodStatsContainer: {
    marginHorizontal: 20,
    marginVertical: 16,
  },
  moodStatsBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodSummaryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
  },
  moodStatsSegment: {
    height: '100%',
  },
  moodStatsRed: {
    backgroundColor: COLORS.emotionNegativeLight,
  },
  moodStatsYellow: {
    backgroundColor: COLORS.emotionNeutralLight,
  },
  moodStatsGreen: {
    backgroundColor: COLORS.emotionPositiveLight,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
