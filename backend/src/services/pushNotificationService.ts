import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PushTokenDatabase } from './database';

const expo = new Expo();

export class PushNotificationService {
  /**
   * Silent Push 전송 (백그라운드 데이터 새로고침용)
   * 사용자에게 알림이 표시되지 않음
   */
  static async sendSilentPush(userId: string): Promise<boolean> {
    const token = PushTokenDatabase.get(userId);
    if (!token) {
      console.log(`⚠️ No push token found for user ${userId}`);
      return false;
    }

    if (!Expo.isExpoPushToken(token)) {
      console.error(`❌ Invalid Expo push token for user ${userId}: ${token}`);
      return false;
    }

    const message: ExpoPushMessage = {
      to: token,
      data: { type: 'silent', action: 'refresh_data' },
      priority: 'high',
      // Silent push: 알림 표시 없이 백그라운드에서만 동작
      _contentAvailable: true,
    };

    try {
      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        console.log(`📤 Silent push sent to user ${userId}`);
      }
      return true;
    } catch (error) {
      console.error(`❌ Failed to send silent push to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * 일반 Push 알림 전송 (사용자에게 표시)
   */
  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    const token = PushTokenDatabase.get(userId);
    if (!token) {
      console.log(`⚠️ No push token found for user ${userId}`);
      return false;
    }

    if (!Expo.isExpoPushToken(token)) {
      console.error(`❌ Invalid Expo push token for user ${userId}: ${token}`);
      return false;
    }

    const message: ExpoPushMessage = {
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
    };

    try {
      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        console.log(`📤 Push notification sent to user ${userId}`);
      }
      return true;
    } catch (error) {
      console.error(`❌ Failed to send push notification to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * 모든 사용자에게 Silent Push 전송
   */
  static async sendSilentPushToAll(): Promise<void> {
    const tokens = PushTokenDatabase.getAll();
    console.log(`📤 Sending silent push to ${tokens.length} users...`);

    for (const { userId } of tokens) {
      await this.sendSilentPush(userId);
      // Rate limiting: 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Silent push sent to all users');
  }

  /**
   * 모든 사용자에게 일반 Push 알림 전송
   */
  static async sendNotificationToAll(title: string, body: string, data?: any): Promise<void> {
    const tokens = PushTokenDatabase.getAll();
    console.log(`📤 Sending push notification to ${tokens.length} users...`);

    for (const { userId } of tokens) {
      await this.sendNotification(userId, title, body, data);
      // Rate limiting: 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Push notifications sent to all users');
  }

  /**
   * AI 코멘트 완료 알림 전송 (Silent Push + 일반 Push)
   */
  static async sendAICommentCompleteNotifications(): Promise<void> {
    // 1단계: Silent Push로 백그라운드 데이터 새로고침
    await this.sendSilentPushToAll();

    // 2단계: 잠시 대기 (데이터 새로고침 시간 확보)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3단계: 일반 푸시 알림으로 사용자에게 알림
    await this.sendNotificationToAll(
      '선생님 코멘트 도착 ✨',
      '밤 사이 선생님이 일기를 읽고 코멘트를 남겼어요',
      { type: 'ai_comment_complete' }
    );
  }
}
