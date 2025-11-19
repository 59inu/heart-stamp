import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { OnboardingService } from '../../services/onboardingService';
import { FirstVisitGuide } from '../../components/FirstVisitGuide';
import { SyncStatusBar } from '../../components/SyncStatusBar';
import { AnimatedHeartIcon } from '../../components/AnimatedHeartIcon';
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

  // loadDiaries 함수의 최신 참조를 유지하기 위한 ref (이벤트 리스너 메모리 누수 방지)
  const loadDiariesRef = useRef(loadDiaries);
  useEffect(() => {
    loadDiariesRef.current = loadDiaries;
  }, [loadDiaries]);

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
      await loadDiariesRef.current();
      logger.log('✅ [DiaryListScreen] Local data reloaded');
    };

    diaryEvents.on(EVENTS.AI_COMMENT_RECEIVED, handleAICommentReceived);

    return () => {
      diaryEvents.off(EVENTS.AI_COMMENT_RECEIVED, handleAICommentReceived);
    };
  }, []); // 빈 의존성 배열 - 한 번만 등록

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
    // TODO: 연간 감정 흐름 화면으로 이동
    navigation.navigate('YearlyEmotionFlow');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AnimatedHeartIcon onPress={handleHeartPress} />
        </View>
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

        <SyncStatusBar onSyncComplete={loadDiaries} />

        <CalendarSection
          currentDate={currentDate}
          markedDates={markedDates}
          onDateSelect={handleDateSelect}
          onMonthChange={(date: DateData) => {
            setCurrentDate(new Date(date.year, date.month - 1, 1));
          }}
          onHeaderPress={() => setShowMonthPicker(true)}
          onTodayPress={() => {
            const today = new Date();
            setCurrentDate(today);
            setSelectedDate(format(today, 'yyyy-MM-dd'));
          }}
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
