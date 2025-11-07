import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { DiaryEntry } from '../../../models/DiaryEntry';
import { DiaryStorage } from '../../../services/diaryStorage';
import { SurveyService } from '../../../services/surveyService';
import { OnboardingService } from '../../../services/onboardingService';
import { logger } from '../../../utils/logger';
import { diaryEvents, EVENTS } from '../../../services/eventEmitter';

export const useDiaryManagement = () => {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 테스트용 리셋 기능 (헤더 5번 탭)
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 로컬 데이터만 빠르게 로드 (화면 진입 시 사용)
  const loadDiaries = useCallback(async () => {
    const entries = await DiaryStorage.getAll();
    setDiaries(entries);
  }, []);

  // Pull-to-Refresh 핸들러
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('🔄 [DiaryListScreen] Pull-to-refresh triggered - syncing with server...');
      await DiaryStorage.syncWithServer();
      await loadDiaries();
      diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
      console.log('✅ [DiaryListScreen] Pull-to-refresh completed');
    } catch (error) {
      logger.error('Pull-to-refresh 오류:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadDiaries]);

  // 테스트용: 헤더 5번 탭으로 데이터 초기화 (개발 모드에서만)
  const handleHeaderTap = useCallback(() => {
    // 프로덕션 모드에서는 작동하지 않음
    if (!__DEV__) {
      return;
    }

    tapCountRef.current += 1;

    // 이전 타이머 취소
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    // 5번 탭하면 리셋 메뉴 표시
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      Alert.alert(
        '🧪 테스트용 데이터 초기화',
        '모든 로컬 데이터를 삭제하시겠습니까?\n\n(서버 데이터는 삭제되지 않습니다)',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '초기화',
            style: 'destructive',
            onPress: async () => {
              try {
                // 모든 일기 삭제
                const allDiaries = await DiaryStorage.getAll();
                for (const diary of allDiaries) {
                  await DiaryStorage.delete(diary._id);
                }

                // SurveyService 데이터 초기화
                await SurveyService.clearAllData();

                // OnboardingService 초기화
                await OnboardingService.resetOnboarding();

                // 화면 새로고침
                await loadDiaries();

                Alert.alert('✅ 초기화 완료', '로컬 데이터가 모두 삭제되었습니다.\n\n앱을 다시 시작하면 온보딩이 표시됩니다.');
              } catch (error) {
                Alert.alert('오류', '데이터 초기화 중 오류가 발생했습니다.');
                console.error('Reset error:', error);
              }
            },
          },
        ]
      );
    } else {
      // 2초 내에 5번 탭하지 않으면 카운트 리셋
      tapTimeoutRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
  }, [loadDiaries]);

  return {
    diaries,
    refreshing,
    loadDiaries,
    handleRefresh,
    handleHeaderTap,
  };
};
