import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { DiaryEntry, StampType } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { DiaryStorage } from '../services/diaryStorage';
import { apiService } from '../services/apiService';
import { WeatherService } from '../services/weatherService';
import { getStampImage, getRandomStampPosition } from '../utils/stampUtils';
import { OnboardingService } from '../services/onboardingService';
import { FirstVisitGuide } from '../components/FirstVisitGuide';
import { logger } from '../utils/logger';
import { CALENDAR_MARKING_STYLES } from '../constants/calendarStyles';
import { COLORS } from '../constants/colors';
import { getEmotionMessage } from '../constants/emotionMessages';
import { diaryEvents, EVENTS } from '../services/eventEmitter';

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

  // 로컬 데이터만 빠르게 로드 (화면 진입 시 사용)
  const loadDiaries = useCallback(async () => {
    const entries = await DiaryStorage.getAll();
    setDiaries(entries);
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

  // AI 코멘트 수신 시 자동 새로고침
  useEffect(() => {
    const handleAICommentReceived = async () => {
      console.log('📖 [DiaryListScreen] AI comment received event - reloading local data...');
      // App.tsx가 이미 DiaryStorage.syncWithServer()로 동기화 완료
      // 여기서는 로컬 데이터만 다시 로드
      await loadDiaries();
      console.log('✅ [DiaryListScreen] Local data reloaded');
    };

    diaryEvents.on(EVENTS.AI_COMMENT_RECEIVED, handleAICommentReceived);

    return () => {
      diaryEvents.off(EVENTS.AI_COMMENT_RECEIVED, handleAICommentReceived);
    };
  }, [loadDiaries]);

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
      const isToday = dateKey === today;
      const hasComment = !!diary.aiComment;

      // 선택된 날짜 - 기존 배경색 유지 + 보라색 보더라인 추가
      if (isSelected) {
        if (hasComment) {
          // AI 코멘트 있는 날짜
          if (diary.mood === 'red') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithCommentRed;
          } else if (diary.mood === 'yellow') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithCommentYellow;
          } else if (diary.mood === 'green') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithCommentGreen;
          } else {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithComment;
          }
        } else {
          // 일반 일기만 있는 날짜
          if (diary.mood === 'red') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithDiaryRed;
          } else if (diary.mood === 'yellow') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithDiaryYellow;
          } else if (diary.mood === 'green') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithDiaryGreen;
          } else {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithDiary;
          }
        }
      }
      // 오늘 날짜 (선택되지 않은 경우) - 두꺼운 보더
      else if (isToday) {
        if (hasComment) {
          // AI 코멘트 있는 날짜
          if (diary.mood === 'red') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithCommentRed;
          } else if (diary.mood === 'yellow') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithCommentYellow;
          } else if (diary.mood === 'green') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithCommentGreen;
          } else {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithComment;
          }
        } else {
          // 일반 일기만 있는 날짜
          if (diary.mood === 'red') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithDiaryRed;
          } else if (diary.mood === 'yellow') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithDiaryYellow;
          } else if (diary.mood === 'green') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithDiaryGreen;
          } else {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithDiary;
          }
        }
      }
      // AI 코멘트 있는 날짜 - 감정에 따라 배경색 표시 + 하늘색 테두리
      else if (hasComment) {
        if (diary.mood === 'red') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withCommentRed;
        } else if (diary.mood === 'yellow') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withCommentYellow;
        } else if (diary.mood === 'green') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withCommentGreen;
        } else {
          // 기분이 없는 경우
          marked[dateKey] = CALENDAR_MARKING_STYLES.withComment;
        }
      }
      // 일반 일기 있는 날짜 - 기분에 따라 배경색 표시
      else {
        if (diary.mood === 'red') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withDiaryRed;
        } else if (diary.mood === 'yellow') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withDiaryYellow;
        } else if (diary.mood === 'green') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withDiaryGreen;
        } else {
          // 기분이 없는 경우
          marked[dateKey] = CALENDAR_MARKING_STYLES.withDiary;
        }
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

    // 오늘 날짜가 일기가 없고 선택되지 않은 경우 두꺼운 보더 표시
    if (!marked[today] && today !== selectedDate) {
      marked[today] = CALENDAR_MARKING_STYLES.today;
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

    const today = new Date();
    const focusedMonth = currentDate.getMonth();
    const focusedYear = currentDate.getFullYear();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 포커싱된 달이 현재 달인 경우: 오늘 날짜 기준
    // 포커싱된 달이 과거 달인 경우: 말일(end) 기준
    // 포커싱된 달이 미래 달인 경우: 초반(start) 기준
    let dayForPeriod: number;

    if (focusedYear === currentYear && focusedMonth === currentMonth) {
      dayForPeriod = today.getDate();
    } else if (
      focusedYear < currentYear ||
      (focusedYear === currentYear && focusedMonth < currentMonth)
    ) {
      // 과거 달: 말일 기준 (21-31)
      dayForPeriod = 25;
    } else {
      // 미래 달: 초반 기준 (1-10)
      dayForPeriod = 5;
    }

    return getEmotionMessage(red, yellow, green, dayForPeriod);
  }, [currentMonthMoodStats, currentDate]);

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
                <Ionicons name="chevron-back" size={24} color={COLORS.buttonText} />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>{currentYear}년</Text>

              <TouchableOpacity
                onPress={() => handleYearChange(1)}
                style={styles.yearArrowButton}
              >
                <Ionicons name="chevron-forward" size={24} color={COLORS.buttonText} />
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
          <MaterialCommunityIcons name="cog" size={22} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Heart Stamp</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Report')}
        >
          <MaterialCommunityIcons name="poll" size={22} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderMonthYearPicker()}

      {/* 이달의 신호등 통계 막대 */}
      <View style={styles.moodStatsContainer}>
        <View style={styles.moodStatsBar}>
          {currentMonthMoodStats.total === 0 ? (
            // 일기가 없을 때 회색 막대
            <View
              style={[
                styles.moodStatsSegment,
                { backgroundColor: '#d0d0d0', flex: 1 },
              ]}
            />
          ) : (
            <>
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
            </>
          )}
        </View>
        <Text style={styles.moodSummaryText}>
          {currentMonthMoodStats.total === 0
            ? '이 달은 어떤 기분으로 채워갈까요'
            : moodSummaryText}
        </Text>
      </View>

      <Calendar
        current={format(currentDate, 'yyyy-MM-dd')}
        markedDates={markedDates}
        onDayPress={handleDateSelect}
        onMonthChange={(date: DateData) => {
          setCurrentDate(new Date(date.year, date.month - 1, 1));
        }}
        markingType="custom"
        renderArrow={(direction: 'left' | 'right') => (
          <View style={styles.calendarArrowButton}>
            <Ionicons
              name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={COLORS.buttonText}
            />
          </View>
        )}
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
          selectedDayBackgroundColor: COLORS.buttonSecondaryBackground,
          todayTextColor: '#2F2B4C',
          arrowColor: COLORS.buttonText,
          dotColor: COLORS.buttonSecondaryBackground,
          textDayFontWeight: '400',
          textDayFontSize: 16,
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textSectionTitleColor: '#9DA3AF',
          textDayColor: '#6B7280',
          textDisabledColor: '#9DA3AF',
          'stylesheet.day.basic': {
            base: {
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            },
            text: {
              marginTop: 6,
              fontSize: 16,
              fontWeight: '400',
            },
          },
        }}
        style={styles.calendar}
      />

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
            <TouchableOpacity
              style={styles.writeButton}
              onPress={handleWriteDiary}
            >
              <Text style={styles.writeButtonText}>
                {selectedDiary ? '보기' : '작성하기'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedDiary ? (
          <TouchableOpacity
            style={styles.selectedDiaryCard}
            onPress={() =>
              navigation.navigate('DiaryDetail', { entryId: selectedDiary._id })
            }
          >
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
                {selectedDiary.stampType && (() => {
                  const stampPos = getRandomStampPosition(selectedDiary._id);
                  return (
                    <Image
                      source={getStampImage(selectedDiary.stampType)}
                      style={[
                        styles.stampImageLarge,
                        {
                          top: stampPos.top,
                          right: stampPos.right,
                          transform: [{ rotate: stampPos.rotation }],
                        },
                      ]}
                      resizeMode="contain"
                    />
                  );
                })()}
                <View style={styles.aiCommentLabelContainer}>
                  <View style={styles.emojiCircle}>
                    <Ionicons name="sparkles" size={12} color="#fff" />
                  </View>
                  <Text style={styles.aiCommentLabel}>선생님 코멘트</Text>
                </View>
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
                ? '기대하며 기다려볼까요 ✨'
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
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  iconButton: {
    padding: 0,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  calendar: {
    marginTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
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
  writeButton: {
    backgroundColor: COLORS.buttonSecondaryBackground,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  writeButtonText: {
    color: COLORS.buttonSecondaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDiaryCard: {
    marginBottom: 24,
  },
  stampImageLarge: {
    width: 150,
    height: 150,
    position: 'absolute',
    opacity: 0.95,
    zIndex: 1,
  },
  cardContent: {
    marginBottom: 16,
  },
  diaryContentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  aiCommentPreview: {
    backgroundColor: '#F0F6FF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: 'relative',
  },
  aiCommentLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  emojiCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 12,
  },
  aiCommentLabel: {
    fontSize: 14,
    color: COLORS.teacherTitle,
    fontWeight: 'bold',
  },
  aiCommentPreviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noAiCommentPreview: {
    backgroundColor: '#F0F6FF',
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
    marginBottom: 20,
    gap: 8,
  },
  moodIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  moodRed: {
    backgroundColor: COLORS.emotionNegativeStrong,
  },
  moodYellow: {
    backgroundColor: COLORS.emotionNeutralStrong,
  },
  moodGreen: {
    backgroundColor: COLORS.emotionPositiveStrong,
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
  calendarArrowButton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: COLORS.buttonSecondaryBackground,
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
    width: 36,
    height: 36,
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodStatsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  moodStatsBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  moodSummaryText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  moodStatsSegment: {
    height: '100%',
  },
  moodStatsRed: {
    backgroundColor: COLORS.emotionNegativeStrong,
  },
  moodStatsYellow: {
    backgroundColor: COLORS.emotionNeutralStrong,
  },
  moodStatsGreen: {
    backgroundColor: COLORS.emotionPositiveStrong,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.buttonSecondaryBackground,
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
