import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Alert, View } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Updates from 'expo-updates';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NotificationService } from './src/services/notificationService';
import { DiaryStorage } from './src/services/diaryStorage';
import { SyncQueue } from './src/services/syncQueue';
import { diaryEvents, EVENTS } from './src/services/eventEmitter';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import { logger } from './src/utils/logger';
import { AnalyticsService } from './src/services/analyticsService';
import { RetentionService } from './src/services/retentionService';
import { initSentry, setUser } from './src/config/sentry';

// Sentry 초기화 (앱 시작 전)
initSentry();

// 스플래시 화면 자동 숨김 방지
SplashScreen.preventAutoHideAsync();

export default function App() {
  const appState = useRef(AppState.currentState);
  const lastSyncTime = useRef(0);
  const SYNC_DEBOUNCE_MS = 180000; // 3분 디바운스 (홈 화면 자동 동기화 제거로 여유 확보)
  const [appIsReady, setAppIsReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // 업데이트 관련 ref
  const currentRouteNameRef = useRef<string>('');
  const lastUpdateCheckTime = useRef(0);
  const isCheckingUpdate = useRef(false);
  const UPDATE_CHECK_DEBOUNCE = 30000; // 30초
  const SAFE_SCREENS = ['DiaryList']; // 홈 화면

  useEffect(() => {
    async function prepare() {
      try {
        // 스플래시 화면을 1.5초간 보여주기
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        logger.error('Splash screen preparation error:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // 스플래시 화면 숨기기
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // 현재 화면 추적 콜백
  const handleRouteChange = useCallback((routeName: string) => {
    currentRouteNameRef.current = routeName;
    logger.log(`[Nav] Current route: ${routeName}`);
  }, []);

  // EAS Update 체크 함수 (Alert 없이 즉시 적용)
  const checkForUpdates = useCallback(async () => {
    if (__DEV__) {
      logger.log('ℹ️ [Update] Skipping in dev mode');
      return;
    }

    if (isCheckingUpdate.current) {
      logger.log('⏳ [Update] Already checking, skip');
      return;
    }

    isCheckingUpdate.current = true;

    try {
      logger.log('🔍 [Update] Checking for updates...');
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        logger.log('📦 [Update] Update available, applying...');
        await AnalyticsService.logEvent('eas_update_applying');
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync(); // 즉시 적용
      } else {
        logger.log('✅ [Update] App is up to date');
      }
    } catch (e) {
      logger.error('❌ [Update] Check failed:', e);
    } finally {
      isCheckingUpdate.current = false;
    }
  }, []);

  useEffect(() => {
    if (!appIsReady) return;

    const initializeApp = async () => {
      // 앱 시작 시 업데이트 체크 (Alert 없이)
      await checkForUpdates();

      // Firebase Auth 및 Analytics 초기화 (완료될 때까지 대기)
      const initAuthAndAnalytics = async () => {
        // Firebase 익명 로그인 초기화
        const { AuthService } = await import('./src/services/authService');
        try {
          const user = await AuthService.initialize();
          logger.log('✅ [App] Firebase Auth initialized:', user.uid);

          // Sentry에 사용자 ID 설정
          setUser(user.uid);
        } catch (error) {
          logger.error('❌ [App] Firebase Auth initialization failed:', error);
        }

        // Analytics 초기화
        await AnalyticsService.initialize();

        const isFirstOpen = await RetentionService.checkAndLogFirstOpen();

        if (!isFirstOpen) {
          // 첫 실행이 아니면 리텐션 지표 업데이트
          await RetentionService.updateOnAppForeground();
        }
      };

      // Firebase Auth 초기화 완료 대기
      await initAuthAndAnalytics();

      // Firebase Auth 초기화 완료 표시
      setAuthReady(true);

      // SyncQueue 네트워크 모니터링 시작
      SyncQueue.startWatching();
      logger.log('✅ [App] SyncQueue network monitoring started');

      // 푸시 알림 등록 및 리스너 설정
      const initPushNotifications = async () => {
      logger.log('📱 [App] Initializing push notifications...');

      // 푸시 토큰 등록 (권한 요청 포함)
      const result = await NotificationService.registerForPushNotifications();

      // 실패 시 로그만 출력 (Alert 제거 - 설정 화면에서만 안내)
      if (!result.success) {
        switch (result.reason) {
          case 'permission_denied':
            logger.log('ℹ️ [App] Push permission denied - user can enable in Settings');
            break;
          case 'network_error':
            logger.log(`⚠️ [App] Network error - will retry on next launch (retried ${result.retriedCount || 0} times)`);
            break;
          case 'not_device':
            logger.log('ℹ️ [App] Running on simulator - push notifications disabled');
            break;
          default:
            logger.log(`⚠️ [App] Push notification registration failed: ${result.reason}`);
        }
        // Alert 제거 - 더 이상 사용자를 방해하지 않음
      } else {
        logger.log('✅ [App] Push notification registration succeeded');
      }

      // 알림 리스너 설정 - AI 코멘트 완료 알림 수신 시 동기화
      NotificationService.setupNotificationListeners(
        async (notification) => {
          logger.log('📬 [App] Notification received:', notification.request.content);

          // AI 코멘트 완료 알림이면 자동으로 동기화 (사용자가 앱을 보고 있을 때도!)
          const notificationType = notification.request.content.data?.type;
          if (notificationType === 'ai_comment_complete') {
            // Analytics: AI 코멘트 알림 수신
            const entryId = String(notification.request.content.data?.diaryId || '');
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

      await initPushNotifications();

      // 일기 작성 알림은 이제 서버에서 푸시 알림으로 전송되므로
      // 로컬 알림 초기화가 필요 없음 (중복 방지)
    };

    // 앱 초기화 실행
    initializeApp();

    // 앱 상태 변경 리스너
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      logger.log(`[App] AppState changed: ${appState.current} -> ${nextAppState}`);

      // 포그라운드 → 백그라운드: 로컬 데이터 백업
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        logger.log('📤 [App] Going to background - syncing local changes to server...');
        const result = await DiaryStorage.syncWithServer();

        if (result.success) {
          logger.log('✅ [App] Background backup completed');
        } else {
          logger.error('❌ [App] Background backup failed:', result.error);
        }
      }

      // 백그라운드 → 포그라운드: 서버 데이터 동기화
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

          // 동기화 후 화면 업데이트 시간 확보
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          logger.log(`⏭️ [App] Skipping sync (only ${Math.round(timeSinceLastSync/1000)}s since last sync)`);
        }

        // 업데이트 체크 (조건: 안전한 화면 + 30초 경과)
        const timeSinceLastUpdateCheck = now - lastUpdateCheckTime.current;
        const isSafeScreen = SAFE_SCREENS.includes(currentRouteNameRef.current);
        const shouldCheckUpdate = timeSinceLastUpdateCheck > UPDATE_CHECK_DEBOUNCE;

        if (isSafeScreen && shouldCheckUpdate) {
          logger.log(`✅ [Update] Safe to check (on ${currentRouteNameRef.current})`);
          lastUpdateCheckTime.current = now;
          await checkForUpdates();
        } else if (!isSafeScreen) {
          logger.log(`⏭️ [Update] Skip (on ${currentRouteNameRef.current}, waiting for safe screen)`);
        } else {
          logger.log(`⏭️ [Update] Skip (checked ${Math.round(timeSinceLastUpdateCheck/1000)}s ago)`);
        }
      }
      appState.current = nextAppState;
    });

    // Cleanup
    return () => {
      NotificationService.removeNotificationListeners();
      subscription.remove();
    };
  }, [appIsReady]);

  if (!appIsReady || !authReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ErrorBoundary level="app">
        <AppNavigator onNavigationStateChange={handleRouteChange} />
        <StatusBar style="auto" />
        <Toast />
        <OfflineBanner />
      </ErrorBoundary>
    </View>
  );
}
