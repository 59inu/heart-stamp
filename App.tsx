import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NotificationService } from './src/services/notificationService';
import { DiaryStorage } from './src/services/diaryStorage';
import { diaryEvents, EVENTS } from './src/services/eventEmitter';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import { logger } from './src/utils/logger';
import { AnalyticsService } from './src/services/analyticsService';
import { RetentionService } from './src/services/retentionService';
import { initSentry, setUser } from './src/config/sentry';

// Sentry 초기화 (앱 시작 전)
initSentry();

export default function App() {
  const appState = useRef(AppState.currentState);
  const lastSyncTime = useRef(0);
  const SYNC_DEBOUNCE_MS = 30000; // 30초 디바운스

  useEffect(() => {
    // Analytics 및 리텐션 추적 초기화
    const initAnalytics = async () => {
      await AnalyticsService.initialize();

      // Sentry에 사용자 ID 설정 (AnalyticsService가 이미 생성한 ID 사용)
      const { UserService } = await import('./src/services/userService');
      const userId = await UserService.getOrCreateUserId();
      setUser(userId);

      const isFirstOpen = await RetentionService.checkAndLogFirstOpen();

      if (!isFirstOpen) {
        // 첫 실행이 아니면 리텐션 지표 업데이트
        await RetentionService.updateOnAppForeground();
      }
    };

    initAnalytics();

    // 푸시 알림 등록 및 리스너 설정
    const initPushNotifications = async () => {
      // 선생님 코멘트 알림 설정 확인
      const isTeacherCommentNotificationEnabled = await NotificationService.getTeacherCommentNotificationEnabled();

      // 알림이 활성화되어 있을 때만 푸시 토큰 등록
      if (!isTeacherCommentNotificationEnabled) {
        logger.log('ℹ️ Teacher comment notification is disabled - skipping push token registration');
        return;
      }

      // 푸시 토큰 등록 (백엔드 등록 포함)
      const result = await NotificationService.registerForPushNotifications();

      // 실패 시 사용자에게 알림
      if (!result.success) {
        let title = '알림 설정 실패';
        let message = '';

        switch (result.reason) {
          case 'permission_denied':
            title = '알림 권한 필요';
            message = '일기에 대한 AI 코멘트 알림을 받으려면 알림 권한이 필요해요.\n\n설정 > 하트스탬프에서 알림을 허용해주세요.';
            break;
          case 'network_error':
            title = '네트워크 연결 실패';
            const maxRetries = 3;
            if (result.retriedCount === maxRetries) {
              // 최대 재시도 횟수 도달
              message = `서버에 연결할 수 없어요.\n${maxRetries}번 재시도했지만 실패했습니다.\n\n다음 앱 실행 시 자동으로 재시도됩니다.\nWi-Fi나 데이터 연결을 확인해주세요.`;
            } else {
              // 재시도 없이 바로 실패 (첫 시도 실패)
              message = '서버에 연결할 수 없어요.\n\n다음 앱 실행 시 자동으로 재시도됩니다.\nWi-Fi나 데이터 연결을 확인해주세요.';
            }
            break;
          case 'not_device':
            // 시뮬레이터에서는 알림 안 띄움
            logger.log('ℹ️ Running on simulator - push notifications disabled');
            return;
          default:
            message = '알림 설정 중 문제가 발생했어요.\n\n다음 앱 실행 시 자동으로 재시도됩니다.';
        }

        // 첫 실행 시 사용자가 앱 UI를 보기 전 다이얼로그가 뜨는 것 방지
        // 2초 딜레이 후 표시
        setTimeout(() => {
          Alert.alert(title, message, [{ text: '확인' }]);
        }, 2000);
      }

      // 알림 리스너 설정 - AI 코멘트 완료 알림 수신 시 동기화
      NotificationService.setupNotificationListeners(
        async (notification) => {
          logger.log('📬 [App] Notification received:', notification.request.content);

          // AI 코멘트 완료 알림이면 자동으로 동기화 (사용자가 앱을 보고 있을 때도!)
          const notificationType = notification.request.content.data?.type;
          if (notificationType === 'ai_comment_complete') {
            // Analytics: AI 코멘트 알림 수신
            const entryId = notification.request.content.data?.diaryId || '';
            await AnalyticsService.logAICommentNotificationReceived(
              entryId,
              AppState.currentState === 'active' ? 'foreground' : 'background'
            );

            logger.log('🔄 [App] AI comment complete notification - syncing data in foreground...');
            const result = await DiaryStorage.syncWithServer();

            if (result.success) {
              diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
              logger.log('✅ [App] Foreground sync completed and screens updated');
            } else {
              logger.error('❌ [App] Foreground sync failed:', result.error);
              // 알림 수신 시에는 사용자가 직접 요청한 것이 아니므로 Alert 표시 안 함
            }
          }
        }
      );
    };

    initPushNotifications();

    // 일기 작성 알림 초기화 (설정이 활성화되어 있으면 예약)
    const initDailyReminder = async () => {
      try {
        const enabled = await NotificationService.getDailyReminderEnabled();
        if (enabled) {
          await NotificationService.scheduleDailyReminder(21, 0);
          logger.log('✅ Daily reminder initialized');
        }
      } catch (error) {
        logger.error('❌ Failed to initialize daily reminder:', error);
      }
    };

    initDailyReminder();

    // 앱 상태 변경 리스너 (백그라운드 → 포그라운드 전환 시 데이터 새로고침)
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      logger.log(`[App] AppState changed: ${appState.current} -> ${nextAppState}`);
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const now = Date.now();
        const timeSinceLastSync = now - lastSyncTime.current;

        // 리텐션 지표 업데이트 (포그라운드 진입 시마다)
        await RetentionService.updateOnAppForeground();

        // 마지막 동기화 후 30초 이상 지났을 때만 동기화
        if (timeSinceLastSync > SYNC_DEBOUNCE_MS) {
          logger.log(`📱 [App] App became active - syncing data (${Math.round(timeSinceLastSync/1000)}s since last sync)...`);
          lastSyncTime.current = now;
          const result = await DiaryStorage.syncWithServer();

          if (result.success) {
            logger.log('📱 [App] Sync completed, emitting event...');
            diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
            logger.log('✅ [App] Event emitted, screens should update now');
          } else {
            logger.error('📱 [App] Sync failed:', result.error);
            // 백그라운드에서 포그라운드로 전환 시에는 Alert 표시하지 않음 (너무 방해됨)
          }
        } else {
          logger.log(`⏭️ [App] Skipping sync (only ${Math.round(timeSinceLastSync/1000)}s since last sync)`);
        }
      }
      appState.current = nextAppState;
    });

    // Cleanup
    return () => {
      NotificationService.removeNotificationListeners();
      subscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary level="app">
      <AppNavigator />
      <StatusBar style="auto" />
      <Toast />
      <OfflineBanner />
    </ErrorBoundary>
  );
}
