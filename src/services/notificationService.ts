import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = '@stamp_diary:push_token';

// 알림이 왔을 때 어떻게 표시할지 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('푸시 알림은 실제 기기에서만 작동합니다');
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
        console.log('푸시 알림 권한이 거부되었습니다');
        return null;
      }

      // 푸시 토큰 받기
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Expo 프로젝트 ID (선택사항)
      });

      const token = tokenData.data;
      console.log('푸시 토큰:', token);

      // 토큰 저장
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // Android 알림 채널 설정
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        });
      }

      return token;
    } catch (error) {
      console.error('푸시 알림 등록 오류:', error);
      return null;
    }
  }

  static async getPushToken(): Promise<string | null> {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  }

  // 로컬 알림 테스트용
  static async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '도장 일기 📔',
        body: '밤 사이 선생님이 일기장을 확인했어요',
        sound: true,
      },
      trigger: {
        seconds: 1,
      },
    });
  }
}
