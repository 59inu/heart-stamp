import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { COLORS } from '../constants/colors';
import { apiService, ApiErrorType } from './apiService';
import { UserService } from './userService';

const PUSH_TOKEN_KEY = '@stamp_diary:push_token';

// 알림 핸들러 설정: 포그라운드에서도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

export type PushNotificationStatus =
  | { success: true; token: string }
  | { success: false; reason: 'permission_denied' | 'network_error' | 'not_device' | 'unknown'; retriedCount?: number };

export class NotificationService {
  private static notificationListener: any = null;
  private static responseListener: any = null;

  static async registerForPushNotifications(): Promise<PushNotificationStatus> {
    if (!Device.isDevice) {
      console.log('⚠️ 푸시 알림은 실제 기기에서만 작동합니다');
      return { success: false, reason: 'not_device' };
    }

    try {
      // 알림 권한 요청
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ 푸시 알림 권한이 거부되었습니다');
        return { success: false, reason: 'permission_denied' };
      }

      // 푸시 토큰 받기
      // 여러 방법으로 projectId 가져오기 시도
      const projectId =
        Constants.expoConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;

      if (__DEV__) {
        console.log('🔍 Constants.expoConfig:', Constants.expoConfig);
        console.log('🔍 Attempting to get projectId...');
        console.log('📱 Project ID found:', projectId);
      }

      if (!projectId) {
        console.log('⚠️ Project ID가 설정되지 않았습니다.');
        if (__DEV__) {
          console.log('💡 개발 모드에서는 푸시 알림이 제한적으로 작동할 수 있습니다.');
          console.log('💡 실제 디바이스에서 테스트하려면 app.json에 projectId를 설정하세요.');
        }
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      const token = tokenData.data;
      console.log('✅ Expo Push Token:', token);
      console.log('✅ Project ID:', projectId);

      // 기존에 저장된 토큰과 다르면 백엔드에 등록
      const savedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      let backendRegistrationResult: { success: boolean; retriedCount: number } | null = null;

      if (savedToken !== token) {
        console.log('🔄 New push token detected, registering with backend...');
        backendRegistrationResult = await this.registerTokenWithBackend(token);
        if (backendRegistrationResult.success) {
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
          console.log('✅ Token saved to AsyncStorage after successful backend registration');
        } else {
          console.error('❌ Token NOT saved to AsyncStorage due to backend registration failure');
          console.error('💡 Will retry on next app launch');
        }
      } else {
        console.log('ℹ️ Push token unchanged, skipping registration');
      }

      // Android 알림 채널 설정
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: COLORS.buttonSecondaryBackground,
        });
      }

      // 백엔드 등록 실패 시 재시도 횟수와 함께 반환
      if (backendRegistrationResult && !backendRegistrationResult.success) {
        return {
          success: false,
          reason: 'network_error',
          retriedCount: backendRegistrationResult.retriedCount
        };
      }

      return { success: true, token };
    } catch (error) {
      console.error('❌ 푸시 알림 등록 오류:', error);
      return { success: false, reason: 'unknown' };
    }
  }

  /**
   * 백엔드에 푸시 토큰 등록 (재시도 로직 포함)
   * @returns { success: boolean, retriedCount: number }
   */
  private static async registerTokenWithBackend(
    token: string,
    retryCount: number = 0
  ): Promise<{ success: boolean; retriedCount: number }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1초

    try {
      const userId = await UserService.getOrCreateUserId();
      const response = await apiService.registerPushToken(userId, token);

      if (response.success) {
        console.log('✅ Push token registered with backend');
        return { success: true, retriedCount: retryCount };
      } else {
        // 서버가 명시적으로 실패를 반환
        console.error('❌ Failed to register push token:', response.message);

        // 네트워크 오류인 경우에만 재시도
        const isRetryable = response.errorType === ApiErrorType.NETWORK_ERROR;
        if (isRetryable && retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying push token registration (${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return this.registerTokenWithBackend(token, retryCount + 1);
        }

        return { success: false, retriedCount: retryCount };
      }
    } catch (error) {
      console.error('❌ Error registering token with backend:', error);

      // 예외 발생 시에도 재시도
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying push token registration after error (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return this.registerTokenWithBackend(token, retryCount + 1);
      }

      return { success: false, retriedCount: retryCount };
    }
  }

  static async getPushToken(): Promise<string | null> {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  }

  /**
   * 알림 리스너 설정
   * @param onNotification - 알림 수신 시 호출되는 콜백
   */
  static setupNotificationListeners(
    onNotification?: (notification: Notifications.Notification) => void
  ): void {
    // 알림 수신 리스너 (앱이 포그라운드/백그라운드일 때)
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 [NotificationService] Notification received');
      console.log('📋 [NotificationService] Data:', notification.request.content.data);
      onNotification?.(notification);
    });

    // 알림 클릭 리스너 (사용자가 알림을 탭했을 때)
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);

      const data = response.notification.request.content.data;
      if (data?.type === 'ai_comment_complete') {
        console.log('📖 Navigate to diary list to see new comments');
        // 필요시 네비게이션 처리
      }
    });
  }

  /**
   * 리스너 제거 (컴포넌트 언마운트 시 호출)
   */
  static removeNotificationListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }
}
