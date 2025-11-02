import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { COLORS } from '../constants/colors';
import { apiService } from './apiService';
import { UserService } from './userService';

const PUSH_TOKEN_KEY = '@stamp_diary:push_token';

// 알림 핸들러 설정: 포그라운드에서도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isSilent = notification.request.content.data?.type === 'silent';

    return {
      shouldShowBanner: !isSilent, // Silent push는 배너 표시 안함
      shouldShowList: true, // 알림 목록에는 항상 표시
      shouldPlaySound: !isSilent,
      shouldSetBadge: false,
    };
  },
});

export class NotificationService {
  private static notificationListener: any = null;
  private static responseListener: any = null;

  static async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('⚠️ 푸시 알림은 실제 기기에서만 작동합니다');
      return null;
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
        return null;
      }

      // 푸시 토큰 받기
      // 여러 방법으로 projectId 가져오기 시도
      const projectId =
        Constants.expoConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;

      console.log('🔍 Constants.expoConfig:', Constants.expoConfig);
      console.log('🔍 Attempting to get projectId...');
      console.log('📱 Project ID found:', projectId);

      if (!projectId) {
        console.log('⚠️ Project ID가 설정되지 않았습니다.');
        console.log('💡 개발 모드에서는 푸시 알림이 제한적으로 작동할 수 있습니다.');
        console.log('💡 실제 디바이스에서 테스트하려면 app.json에 projectId를 설정하세요.');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      const token = tokenData.data;
      console.log('✅ Expo Push Token:', token);
      console.log('✅ Project ID:', projectId);

      // 기존에 저장된 토큰과 다르면 백엔드에 등록
      const savedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (savedToken !== token) {
        await this.registerTokenWithBackend(token);
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
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

      return token;
    } catch (error) {
      console.error('❌ 푸시 알림 등록 오류:', error);
      return null;
    }
  }

  /**
   * 백엔드에 푸시 토큰 등록
   */
  private static async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const userId = await UserService.getOrCreateUserId();
      const response = await apiService.registerPushToken(userId, token);

      if (response.success) {
        console.log('✅ Push token registered with backend');
      } else {
        console.error('❌ Failed to register push token:', response.message);
      }
    } catch (error) {
      console.error('❌ Error registering token with backend:', error);
    }
  }

  static async getPushToken(): Promise<string | null> {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  }

  /**
   * 알림 리스너 설정
   * @param onSilentPush - Silent Push 수신 시 호출되는 콜백 (데이터 새로고침용)
   * @param onNotification - 일반 알림 수신 시 호출되는 콜백
   */
  static setupNotificationListeners(
    onSilentPush?: () => void,
    onNotification?: (notification: Notifications.Notification) => void
  ): void {
    // 알림 수신 리스너 (앱이 포그라운드/백그라운드일 때)
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 [NotificationService] Notification received');
      console.log('📋 [NotificationService] Full notification:', JSON.stringify(notification, null, 2));
      console.log('📋 [NotificationService] Data:', notification.request.content.data);

      const isSilent = notification.request.content.data?.type === 'silent';
      console.log(`🔍 [NotificationService] Is silent push? ${isSilent}`);

      if (isSilent) {
        console.log('🔄 [NotificationService] Silent push detected - calling onSilentPush callback...');
        onSilentPush?.();
        console.log('✅ [NotificationService] onSilentPush callback completed');
      } else {
        console.log('📢 [NotificationService] Regular notification - calling onNotification callback...');
        onNotification?.(notification);
      }
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
