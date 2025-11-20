import { useState, useCallback, useRef, useEffect } from 'react';
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

  // Cleanup: 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
    };
  }, []);

  // 로컬 데이터 빠르게 로드 + 백그라운드 서버 동기화
  const loadDiaries = useCallback(async () => {
    // 로컬 데이터만 로드 (서버 동기화는 App.tsx의 AppState 리스너가 담당)
    // 이렇게 하면 홈 화면 방문 시마다 불필요한 API 요청이 발생하지 않음
    const entries = await DiaryStorage.getAll();
    setDiaries(entries);
    logger.log('📖 [DiaryListScreen] Local diaries loaded');
  }, []);

  // Pull-to-Refresh 핸들러
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      logger.log('🔄 [DiaryListScreen] Pull-to-refresh triggered - syncing with server...');
      const result = await DiaryStorage.syncWithServer();

      if (!result.success) {
        // 중복 동기화는 정상적인 상황이므로 Alert 표시 안 함
        if (result.alreadySyncing) {
          logger.log('⏭️ [DiaryListScreen] Sync already in progress, skipping alert');
        } else {
          // 실제 에러(네트워크, 서버 등)만 Alert 표시
          logger.error('동기화 실패:', result.error);
          Alert.alert(
            '동기화 실패',
            `서버와 동기화하지 못했습니다.\n\n${result.error}\n\n나중에 다시 시도해주세요.`,
            [{ text: '확인' }]
          );
        }
      } else {
        logger.log('✅ [DiaryListScreen] Pull-to-refresh completed');
        diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
      }

      // 로컬 데이터만 새로고침 (중복 동기화 방지)
      const entries = await DiaryStorage.getAll();
      setDiaries(entries);
    } catch (error) {
      logger.error('Pull-to-refresh 오류:', error);
      Alert.alert('오류', '새로고침 중 오류가 발생했습니다.');
    } finally {
      setRefreshing(false);
    }
  }, []);

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
                logger.error('Reset error:', error);
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
