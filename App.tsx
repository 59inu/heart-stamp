import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NotificationService } from './src/services/notificationService';
import { DiaryStorage } from './src/services/diaryStorage';
import { diaryEvents, EVENTS } from './src/services/eventEmitter';

export default function App() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 푸시 알림 등록 및 리스너 설정
    const initPushNotifications = async () => {
      // 푸시 토큰 등록 (백엔드 등록 포함)
      await NotificationService.registerForPushNotifications();

      // 알림 리스너 설정
      NotificationService.setupNotificationListeners(
        // Silent Push 수신 시: 데이터 새로고침 + 화면 업데이트
        async () => {
          console.log('🔄 [App] Silent Push handler called - starting data sync...');
          await DiaryStorage.syncWithServer();
          diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
          console.log('✅ [App] Diary data refreshed and screens updated');
        },
        // 일반 알림 수신 시 (포그라운드에서도 동기화!)
        async (notification) => {
          console.log('📬 [App] Regular notification received:', notification.request.content);

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
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App became active - syncing data...');
        await DiaryStorage.syncWithServer();
        diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
        console.log('✅ App resumed - data synced and screens updated');
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
