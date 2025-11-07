import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { OnboardingService } from '../../services/onboardingService';
import { FirstVisitGuide } from '../../components/FirstVisitGuide';
import { COLORS } from '../../constants/colors';
import { diaryEvents, EVENTS } from '../../services/eventEmitter';
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
  const { currentMonthMoodStats, moodSummaryText } = useMoodStats(diaries, currentDate);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialCommunityIcons name="cog" size={22} color="#4B5563" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleHeaderTap} activeOpacity={0.9}>
          <Text style={styles.headerTitle}>Heart Stamp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Report')}
        >
          <MaterialCommunityIcons name="poll" size={22} color="#4B5563" />
        </TouchableOpacity>
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
          onDiaryPress={() =>
            navigation.navigate('DiaryDetail', { entryId: selectedDiary!._id })
          }
        />
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
    fontSize: 18,
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
