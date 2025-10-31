import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
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

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryList'>;

const ITEM_HEIGHT = 50;
const WHEEL_HEIGHT = 250;

export const DiaryListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const yearScrollRef = useRef<ScrollView>(null);

  const loadDiaries = useCallback(async () => {
    let entries = await DiaryStorage.getAll();

    // 로컬에 일기가 없으면 서버에서 전체 가져오기
    if (entries.length === 0) {
      try {
        const serverDiaries = await apiService.getAllDiaries();
        console.log(`📥 서버에서 ${serverDiaries.length}개 일기 가져오기`);

        for (const diary of serverDiaries) {
          await DiaryStorage.saveFromServer(diary);
        }

        entries = await DiaryStorage.getAll();
      } catch (error) {
        console.error('서버에서 일기 가져오기 실패:', error);
      }
    }

    // 서버에서 AI 코멘트 동기화 (항상 최신 데이터 가져오기)
    for (const entry of entries) {
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
    const today = format(new Date(), 'yyyy-MM-dd');

    diaries.forEach((diary) => {
      const dateKey = format(new Date(diary.date), 'yyyy-MM-dd');
      const isSelected = dateKey === selectedDate;
      const hasComment = !!diary.aiComment;

      // 선택된 날짜
      if (isSelected) {
        marked[dateKey] = {
          customStyles: {
            container: {
              backgroundColor: '#4CAF50',
              borderRadius: 16,
            },
            text: {
              // 코멘트 있으면 연한 피치색, 없으면 흰색
              color: hasComment ? '#FFDAB9' : '#fff',
              fontWeight: 'bold',
            },
          },
        };
      }
      // AI 코멘트 있는 날짜 - 피치색 배경
      else if (hasComment) {
        marked[dateKey] = {
          customStyles: {
            container: {
              backgroundColor: '#FFDAB9',
              borderRadius: 16,
            },
            text: {
              color: '#000',
              fontWeight: 'bold',
            },
          },
        };
      }
      // 일반 일기 있는 날짜 - 볼드체만
      else {
        marked[dateKey] = {
          customStyles: {
            container: {
              backgroundColor: 'transparent',
              borderRadius: 16,
            },
            text: {
              color: '#000',
              fontWeight: 'bold',
            },
          },
        };
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
          marked[dateKey] = {
            customStyles: {
              container: {
                backgroundColor: 'transparent',
              },
              text: {
                color: '#e0e0e0', // 연한 회색 - 미래 날짜
                fontWeight: '300',
              },
            },
          };
        }
      }
    }

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

  const handleYearSelect = (year: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
    setShowYearPicker(false);
    setShowMonthPicker(true);
  };

  const handleMonthSelect = (month: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month);
    setCurrentDate(newDate);
    setShowMonthPicker(false);
  };

  const handleCloseModal = () => {
    setShowMonthPicker(false);
    setShowYearPicker(false);
    setScrollY(0); // scrollY 리셋
  };

  // 휠 피커 스크롤 이벤트
  const handleYearScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  // 연도 선택 시 스크롤 위치 계산
  const scrollToYear = (year: number, years: number[]) => {
    const index = years.indexOf(year);
    if (index !== -1 && yearScrollRef.current) {
      yearScrollRef.current.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: true,
      });
    }
  };

  // 스크롤뷰 레이아웃 완료 시 초기 위치로 스크롤
  const handleScrollViewLayout = () => {
    const currentYear = currentDate.getFullYear();
    const startYear = currentYear - 20;
    const endYear = currentYear + 5;
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i).reverse();
    const index = years.indexOf(currentYear);

    if (index !== -1 && yearScrollRef.current) {
      const initialScrollY = index * ITEM_HEIGHT;
      setScrollY(initialScrollY);

      // 즉시 스크롤
      yearScrollRef.current.scrollTo({
        y: initialScrollY,
        animated: false,
      });
    }
  };

  const renderMonthYearPicker = () => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    // 과거 20년부터 미래 5년까지 표시
    const startYear = currentYear - 20;
    const endYear = currentYear + 5;
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i).reverse();
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    // 휠 피커 스타일 계산
    const getYearItemStyle = (index: number) => {
      const centerOffset = scrollY + WHEEL_HEIGHT / 2;
      const itemCenter = index * ITEM_HEIGHT + ITEM_HEIGHT / 2;
      const distance = Math.abs(centerOffset - itemCenter);

      // 중앙으로부터의 거리에 따라 스케일과 투명도 계산
      const maxDistance = WHEEL_HEIGHT / 2;
      const normalizedDistance = Math.min(distance / maxDistance, 1);

      const scale = 1 + (1 - normalizedDistance) * 0.5; // 1.0 ~ 1.5
      const opacity = 0.3 + (1 - normalizedDistance) * 0.7; // 0.3 ~ 1.0
      const fontSize = 16 + (1 - normalizedDistance) * 12; // 16 ~ 28

      return {
        transform: [{ scale }],
        opacity,
        fontSize,
      };
    };

    return (
      <Modal
        visible={showMonthPicker || showYearPicker}
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
            <TouchableOpacity
              style={styles.modalHeader}
              onPress={() => {
                if (showMonthPicker) {
                  setShowMonthPicker(false);
                  setShowYearPicker(true);
                }
              }}
            >
              <Text style={styles.modalTitle}>
                {showYearPicker ? '연도 선택' : `${currentYear}년`}
              </Text>
              {showMonthPicker && <Ionicons name="chevron-down" size={20} color="#333" />}
            </TouchableOpacity>

            {showYearPicker ? (
              <View style={styles.wheelContainer}>
                {/* 중앙 하이라이트 인디케이터 */}
                <View style={styles.wheelIndicatorTop} />
                <View style={styles.wheelIndicatorBottom} />

                <ScrollView
                  ref={yearScrollRef}
                  style={styles.wheelScroll}
                  contentContainerStyle={{
                    paddingVertical: WHEEL_HEIGHT / 2 - ITEM_HEIGHT / 2,
                  }}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleYearScroll}
                  scrollEventThrottle={16}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onLayout={handleScrollViewLayout}
                  onMomentumScrollEnd={(event) => {
                    const offsetY = event.nativeEvent.contentOffset.y;
                    const index = Math.round(offsetY / ITEM_HEIGHT);
                    if (years[index]) {
                      // 자동으로 선택 (선택 효과만, 실제 적용은 아이템 클릭 시)
                    }
                  }}
                >
                  {years.map((year, index) => {
                    const itemStyle = getYearItemStyle(index);
                    const isCenter = Math.abs(scrollY + WHEEL_HEIGHT / 2 - (index * ITEM_HEIGHT + ITEM_HEIGHT / 2)) < ITEM_HEIGHT / 2;

                    return (
                      <TouchableOpacity
                        key={year}
                        style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
                        onPress={() => handleYearSelect(year)}
                      >
                        <Text
                          style={[
                            styles.wheelItemText,
                            {
                              fontSize: itemStyle.fontSize,
                              opacity: itemStyle.opacity,
                              fontWeight: isCenter ? 'bold' : '400',
                              color: isCenter ? '#4CAF50' : '#333',
                            },
                          ]}
                        >
                          {year}년
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <ScrollView style={styles.pickerScroll}>
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
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="stats-chart" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {renderMonthYearPicker()}

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
          {selectedDate <= format(new Date(), 'yyyy-MM-dd') && (
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
              <Text style={styles.diaryContentText} numberOfLines={3} ellipsizeMode="tail">
                {selectedDiary.content.replace(/\n/g, ' ')}
              </Text>
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
            <Text style={styles.noDiaryText}>
              {selectedDate > format(new Date(), 'yyyy-MM-dd')
                ? '아직 오지 않은 미래에요'
                : selectedDate === format(new Date(), 'yyyy-MM-dd')
                ? '오늘의 일기를 작성하세요'
                : '이 날의 일기가 없어요'}
            </Text>
            <Text style={styles.noDiarySubText}>
              {selectedDate > format(new Date(), 'yyyy-MM-dd')
                ? '기대하며 기다려볼까요'
                : selectedDate === format(new Date(), 'yyyy-MM-dd')
                ? '선생님이 기다리고 있어요'
                : '기억을 기록해주세요'}
            </Text>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    // iOS 그림자
    shadowColor: '#4CAF50',
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
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerScroll: {
    marginTop: 16,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    backgroundColor: '#4CAF50',
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
  wheelContainer: {
    height: WHEEL_HEIGHT,
    marginTop: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  wheelScroll: {
    flex: 1,
  },
  wheelIndicatorTop: {
    position: 'absolute',
    top: WHEEL_HEIGHT / 2 - ITEM_HEIGHT / 2,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#4CAF50',
    zIndex: 10,
  },
  wheelIndicatorBottom: {
    position: 'absolute',
    top: WHEEL_HEIGHT / 2 + ITEM_HEIGHT / 2,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#4CAF50',
    zIndex: 10,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    textAlign: 'center',
  },
});
