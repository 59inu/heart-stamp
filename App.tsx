import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NotificationService } from './src/services/notificationService';
import { apiService } from './src/services/apiService';
import { DiaryStorage } from './src/services/diaryStorage';

export default function App() {
  useEffect(() => {
    // 푸시 알림 등록
    const registerPushNotifications = async () => {
      const token = await NotificationService.registerForPushNotifications();
      if (token) {
        console.log('푸시 알림 등록 완료:', token);
        // 백엔드에 토큰 전송
        const success = await apiService.registerPushToken(token);
        if (success) {
          console.log('✅ 백엔드에 푸시 토큰 등록 완료');
        } else {
          console.log('⚠️ 백엔드 푸시 토큰 등록 실패 (서버가 실행 중인지 확인하세요)');
        }
      }
    };

    registerPushNotifications();
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
