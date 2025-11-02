import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NotificationService } from './src/services/notificationService';
import { DiaryStorage } from './src/services/diaryStorage';
import { diaryEvents, EVENTS } from './src/services/eventEmitter';

export default function App() {
  const appState = useRef(AppState.currentState);
  const lastSyncTime = useRef(0);
  const SYNC_DEBOUNCE_MS = 30000; // 30초 디바운스

  useEffect(() => {
    // 푸시 알림 등록 및 리스너 설정
    const initPushNotifications = async () => {
      // 푸시 토큰 등록 (백엔드 등록 포함)
      await NotificationService.registerForPushNotifications();

      // 알림 리스너 설정 - AI 코멘트 완료 알림 수신 시 동기화
      NotificationService.setupNotificationListeners(
        async (notification) => {
          console.log('📬 [App] Notification received:', notification.request.content);

          // AI 코멘트 완료 알림이면 자동으로 동기화 (사용자가 앱을 보고 있을 때도!)
          const notificationType = notification.request.content.data?.type;
          if (notificationType === 'ai_comment_complete') {
            console.log('🔄 [App] AI comment complete notification - syncing data in foreground...');
            await DiaryStorage.syncWithServer();
            diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
            console.log('✅ [App] Foreground sync completed and screens updated');
          }
        }
      );
    };

    initPushNotifications();

    // 앱 상태 변경 리스너 (백그라운드 → 포그라운드 전환 시 데이터 새로고침)
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      console.log(`[App] AppState changed: ${appState.current} -> ${nextAppState}`);
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const now = Date.now();
        const timeSinceLastSync = now - lastSyncTime.current;

        // 마지막 동기화 후 30초 이상 지났을 때만 동기화
        if (timeSinceLastSync > SYNC_DEBOUNCE_MS) {
          console.log(`📱 [App] App became active - syncing data (${Math.round(timeSinceLastSync/1000)}s since last sync)...`);
          lastSyncTime.current = now;
          await DiaryStorage.syncWithServer();
          console.log('📱 [App] Sync completed, emitting event...');
          diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
          console.log('✅ [App] Event emitted, screens should update now');
        } else {
          console.log(`⏭️ [App] Skipping sync (only ${Math.round(timeSinceLastSync/1000)}s since last sync)`);
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
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
