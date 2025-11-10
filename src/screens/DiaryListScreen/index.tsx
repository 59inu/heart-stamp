import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { RootStackParamList } from '../../navigation/types';
import { OnboardingService } from '../../services/onboardingService';
import { FirstVisitGuide } from '../../components/FirstVisitGuide';
import { COLORS } from '../../constants/colors';
import { diaryEvents, EVENTS } from '../../services/eventEmitter';
import { logger } from '../../utils/logger';
import { useDiaryManagement } from './hooks/useDiaryManagement';
import { useCalendarMarking } from './hooks/useCalendarMarking';
import { useMoodStats } from './hooks/useMoodStats';
import { MonthYearPicker } from './components/MonthYearPicker';
import { MoodStatsBar } from './components/MoodStatsBar';
import { CalendarSection } from './components/CalendarSection';
import { SelectedDateSection } from './components/SelectedDateSection';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryList'>;

export const DiaryListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 하트 애니메이션
  const heartShake = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  // Custom hooks
  const {
    diaries,
    refreshing,
    loadDiaries,
    handleRefresh,
    handleHeaderTap,
  } = useDiaryManagement();

  // 오늘 날짜를 한 번만 계산 (성능 최적화)
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Calendar marking
  const markedDates = useCalendarMarking(diaries, selectedDate, today);

  // Mood statistics
  const { currentMonthMoodStats, moodSummaryText, stampCount } = useMoodStats(diaries, currentDate);

  // 선택된 날짜의 일기
  const selectedDiary = useMemo(() => {
    return diaries.find((diary) => {
      const diaryDate = format(new Date(diary.date), 'yyyy-MM-dd');
      return diaryDate === selectedDate;
    });
  }, [diaries, selectedDate]);

  // 오늘 일기 작성 여부
  const hasTodayDiary = useMemo(() => {
    return diaries.some((diary) => {
      const diaryDate = format(new Date(diary.date), 'yyyy-MM-dd');
      return diaryDate === today;
    });
  }, [diaries, today]);

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
      logger.log('📖 [DiaryListScreen] AI comment received event - reloading local data...');
      // App.tsx가 이미 DiaryStorage.syncWithServer()로 동기화 완료
      // 여기서는 로컬 데이터만 다시 로드
      await loadDiaries();
      logger.log('✅ [DiaryListScreen] Local data reloaded');
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

  const handleStampPress = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 0-11 -> 1-12
    navigation.navigate('StampCollection', { year, month });
  }, [currentDate, navigation]);

  const handleHeartPress = useCallback(() => {
    // 흔들림 + 통통 튀는 애니메이션
    Animated.sequence([
      // 커지면서
      Animated.timing(heartScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      // 흔들리기
      Animated.parallel([
        Animated.sequence([
          Animated.timing(heartShake, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(heartShake, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(heartShake, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(heartShake, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(heartShake, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // 크기는 원래대로
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [heartShake, heartScale]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleHeartPress} activeOpacity={0.8}>
          <Animated.View
            style={{
              transform: [
                { rotate: heartShake.interpolate({
                  inputRange: [-10, 10],
                  outputRange: ['-10deg', '10deg'],
                })},
                { scale: heartScale },
              ],
            }}
          >
            {/* 동그라미 3개 겹쳐진 하트 */}
            <MaskedView
              maskElement={
                <Ionicons name="heart" size={28} color="#fff" />
              }
            >
              <View style={{ width: 28, height: 28, position: 'relative' }}>
                {/* 베이지 원 - 왼쪽 위 */}
                <View style={{
                  position: 'absolute',
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#F5EFE5',
                  left: 2,
                  top: 3,
                  opacity: 1,
                }} />
                {/* 핑크 원 - 오른쪽 위 (조금 작게) */}
                <View style={{
                  position: 'absolute',
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#F19392',
                  right: -2,
                  top: 3,
                  opacity: 1,
                }} />

                  {/* 블루 원 - 아래 좌측 */}
                <View style={{
                  position: 'absolute',
                  width: 20,
                  height: 18,
                  borderRadius: 10,
                  backgroundColor: '#87A6D1',
                  left: 5,
                  bottom: -2,
                  opacity: 1,
                }} />
                                {/* 민트 작은 점 */}
                <View style={{
                  position: 'absolute',
                  width: 15,
                  height: 8,
                  borderRadius: 5,
                  backgroundColor: '#9DD2B6',
                  left: 0,
                  bottom: 10,
                  opacity: 1,
                }} />
              </View>
            </MaskedView>
          </Animated.View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Report')}
          >
            <MaterialCommunityIcons name="poll" size={22} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, styles.iconButtonLast]}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialCommunityIcons name="cog" size={22} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <MonthYearPicker
          visible={showMonthPicker}
          currentDate={currentDate}
          onMonthSelect={handleMonthSelect}
          onYearChange={handleYearChange}
          onClose={handleCloseModal}
        />

        <MoodStatsBar
          moodStats={currentMonthMoodStats}
          summaryText={moodSummaryText}
          stampCount={stampCount}
          onStampPress={handleStampPress}
        />

        <CalendarSection
          currentDate={currentDate}
          markedDates={markedDates}
          onDateSelect={handleDateSelect}
          onMonthChange={(date: DateData) => {
            setCurrentDate(new Date(date.year, date.month - 1, 1));
          }}
          onHeaderPress={() => setShowMonthPicker(true)}
        />

        <SelectedDateSection
          selectedDate={selectedDate}
          today={today}
          selectedDiary={selectedDiary}
          onWriteDiary={handleWriteDiary}
          onDiaryPress={() => {
            if (selectedDiary) {
              navigation.navigate('DiaryDetail', { entryId: selectedDiary._id });
            }
          }}
        />
      </ScrollView>

      {/* 빠른 작성 버튼 - 오늘 일기가 없을 때만 표시 */}
      {!hasTodayDiary && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate('DiaryWrite', { date: new Date() })}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={28} color="#fff" />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 0,
    position: 'relative',
  },
  iconButtonLast: {
    marginLeft: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.buttonSecondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
});
