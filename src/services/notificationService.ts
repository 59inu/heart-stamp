import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { COLORS } from '../constants/colors';
import { apiService, ApiErrorType } from './apiService';
import { UserService } from './userService';
import { logger } from '../utils/logger';

const PUSH_TOKEN_KEY = '@stamp_diary:push_token';
const DAILY_REMINDER_KEY = '@stamp_diary:daily_reminder_enabled';
const TEACHER_COMMENT_NOTIFICATION_KEY = '@stamp_diary:teacher_comment_notification_enabled';

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
      logger.log('⚠️ 푸시 알림은 실제 기기에서만 작동합니다');
      return { success: false, reason: 'not_device' };
    }

    try {
      // 알림 권한 확인
      logger.log('📱 [registerForPushNotifications] Checking existing permission...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      logger.log('📱 [registerForPushNotifications] Existing status:', existingStatus);
      let finalStatus = existingStatus;

      // 최초 1회만 권한 요청 (undetermined 상태에서만)
      if (existingStatus === 'undetermined') {
        logger.log('📱 [registerForPushNotifications] Requesting permission (first time)...');
        const { status } = await Notifications.requestPermissionsAsync();
        logger.log('📱 [registerForPushNotifications] Request result:', status);
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.log('⚠️ 푸시 알림 권한이 없습니다. Final status:', finalStatus);
        return { success: false, reason: 'permission_denied' };
      }

      logger.log('✅ 푸시 알림 권한 획득!');

      // 푸시 토큰 받기
      // 여러 방법으로 projectId 가져오기 시도
      const projectId =
        Constants.expoConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;

      if (__DEV__) {
        logger.log('🔍 Constants.expoConfig:', Constants.expoConfig);
        logger.log('🔍 Attempting to get projectId...');
        logger.log('📱 Project ID found:', projectId);
      }

      if (!projectId) {
        logger.log('⚠️ Project ID가 설정되지 않았습니다.');
        if (__DEV__) {
          logger.log('💡 개발 모드에서는 푸시 알림이 제한적으로 작동할 수 있습니다.');
          logger.log('💡 실제 디바이스에서 테스트하려면 app.json에 projectId를 설정하세요.');
        }
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      const token = tokenData.data;
      logger.log('✅ Expo Push Token:', token);
      logger.log('✅ Project ID:', projectId);

      // 항상 백엔드에 토큰 등록 시도 (백엔드 DB 리셋 대응)
      logger.log('🔄 Registering push token with backend...');
      const backendRegistrationResult = await this.registerTokenWithBackend(token);

      if (backendRegistrationResult.success) {
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        logger.log('✅ Token registered with backend and saved to AsyncStorage');
      } else {
        logger.error('❌ Failed to register token with backend');
        logger.error('💡 Will retry on next app launch');
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
      if (!backendRegistrationResult.success) {
        return {
          success: false,
          reason: 'network_error',
          retriedCount: backendRegistrationResult.retriedCount
        };
      }

      return { success: true, token };
    } catch (error) {
      logger.error('❌ 푸시 알림 등록 오류:', error);
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
        logger.log('✅ Push token registered with backend');
        return { success: true, retriedCount: retryCount };
      } else {
        // 서버가 명시적으로 실패를 반환
        logger.error('❌ Failed to register push token:', response.message);

        // 네트워크 오류인 경우에만 재시도
        const isRetryable = response.errorType === ApiErrorType.NETWORK_ERROR;
        if (isRetryable && retryCount < MAX_RETRIES) {
          logger.log(`🔄 Retrying push token registration (${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return this.registerTokenWithBackend(token, retryCount + 1);
        }

        return { success: false, retriedCount: retryCount };
      }
    } catch (error) {
      logger.error('❌ Error registering token with backend:', error);

      // 예외 발생 시에도 재시도
      if (retryCount < MAX_RETRIES) {
        logger.log(`🔄 Retrying push token registration after error (${retryCount + 1}/${MAX_RETRIES})...`);
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
      logger.log('📬 [NotificationService] Notification received');
      logger.log('📋 [NotificationService] Data:', notification.request.content.data);
      onNotification?.(notification);
    });

    // 알림 클릭 리스너 (사용자가 알림을 탭했을 때)
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      logger.log('👆 Notification tapped:', response);

      const data = response.notification.request.content.data;
      if (data?.type === 'ai_comment_complete') {
        logger.log('📖 Navigate to diary list to see new comments');
        // 필요시 네비게이션 처리
      } else if (data?.type === 'image_generated') {
        logger.log('🎨 Image generated notification - Navigate to diary:', data.diaryId);
        // TODO: Navigate to specific diary detail screen
        // navigation.navigate('DiaryDetail', { diaryId: data.diaryId });
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

  /**
   * 일기 작성 알림 설정 상태 불러오기
   * 권한이 없으면 자동으로 false 반환
   */
  static async getDailyReminderEnabled(): Promise<boolean> {
    try {
      // 권한 체크
      const hasPermission = await this.checkPushPermission();
      if (!hasPermission) {
        // 권한 없으면 설정도 false로 동기화
        await AsyncStorage.setItem(DAILY_REMINDER_KEY, 'false');
        return false;
      }

      const value = await AsyncStorage.getItem(DAILY_REMINDER_KEY);
      // 기본값은 true (처음 설치 시 알림 활성화)
      return value === null ? true : value === 'true';
    } catch (error) {
      logger.error('❌ Failed to get daily reminder setting:', error);
      return false; // 오류 시 false 반환
    }
  }

  /**
   * 일기 작성 알림 설정 저장
   * 로컬 설정 저장 후 백엔드 API를 통해 서버 설정을 동기화합니다.
   */
  static async setDailyReminderEnabled(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        // 권한 확인
        const hasPermission = await this.checkPushPermission();
        if (!hasPermission) {
          throw new Error('Push notification permission denied');
        }
      }

      // 로컬 설정 저장
      await AsyncStorage.setItem(DAILY_REMINDER_KEY, String(enabled));

      // 백엔드 API 호출하여 서버 설정 동기화
      const result = await apiService.updateNotificationPreferences(enabled, undefined);
      if (!result.success) {
        logger.error('❌ Failed to sync daily reminder setting to backend:', result.error);
        // 실패해도 로컬 설정은 유지 (다음에 재시도 가능)
      } else {
        logger.log(`✅ Daily reminder ${enabled ? 'enabled' : 'disabled'} (synced to backend)`);
      }
    } catch (error) {
      logger.error('❌ Failed to set daily reminder setting:', error);
      throw error;
    }
  }

  /**
   * 푸시 알림 권한 상태 확인
   * @returns true if granted, false otherwise
   */
  static async checkPushPermission(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        return false; // 시뮬레이터에서는 권한 없음
      }

      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error('❌ Failed to check push permission:', error);
      return false;
    }
  }

  /**
   * 선생님 코멘트 알림 설정 상태 불러오기
   * 권한이 없으면 자동으로 false 반환
   */
  static async getTeacherCommentNotificationEnabled(): Promise<boolean> {
    try {
      // 권한 체크
      const hasPermission = await this.checkPushPermission();
      if (!hasPermission) {
        // 권한 없으면 설정도 false로 동기화
        await AsyncStorage.setItem(TEACHER_COMMENT_NOTIFICATION_KEY, 'false');
        return false;
      }

      const value = await AsyncStorage.getItem(TEACHER_COMMENT_NOTIFICATION_KEY);
      // 기본값은 true (처음 설치 시 알림 활성화)
      return value === null ? true : value === 'true';
    } catch (error) {
      logger.error('❌ Failed to get teacher comment notification setting:', error);
      return false; // 오류 시 false 반환
    }
  }

  /**
   * 선생님 코멘트 알림 설정 저장
   */
  static async setTeacherCommentNotificationEnabled(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        // 권한 확인
        const hasPermission = await this.checkPushPermission();
        if (!hasPermission) {
          throw new Error('Push notification permission denied');
        }

        // 토큰이 서버에 등록되어 있는지 확인
        const token = await this.getPushToken();
        if (!token) {
          // 토큰이 없으면 재등록 시도 (네트워크 오류 복구)
          logger.log('🔄 No push token found, re-registering...');
          const result = await this.registerForPushNotifications();
          if (!result.success) {
            throw new Error(`Failed to register push token: ${result.reason}`);
          }
        }
      }

      // 로컬 설정 저장
      await AsyncStorage.setItem(TEACHER_COMMENT_NOTIFICATION_KEY, String(enabled));

      // 백엔드 API 호출하여 서버 설정 동기화
      const result = await apiService.updateNotificationPreferences(undefined, enabled);
      if (!result.success) {
        logger.error('❌ Failed to sync teacher comment notification setting to backend:', result.error);
        // 실패해도 로컬 설정은 유지 (다음에 재시도 가능)
      } else {
        logger.log(`✅ Teacher comment notification ${enabled ? 'enabled' : 'disabled'} (synced to backend)`);
      }
    } catch (error) {
      logger.error('❌ Failed to set teacher comment notification setting:', error);
      throw error;
    }
  }

  /**
   * 백엔드에서 푸시 토큰 삭제
   */
  private static async unregisterPushToken(): Promise<void> {
    try {
      const result = await apiService.deletePushToken();

      if (result.success) {
        // 로컬에 저장된 토큰도 삭제
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        logger.log('✅ Push token unregistered from backend and local storage');
      } else {
        logger.error('❌ Failed to unregister push token from backend:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('❌ Error unregistering push token:', error);
      throw error;
    }
  }
}
