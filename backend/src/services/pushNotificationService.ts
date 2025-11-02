import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PushTokenDatabase } from './database';

const expo = new Expo();

export class PushNotificationService {
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
   * 특정 사용자 목록에게만 일반 Push 알림 전송
   */
  static async sendNotificationToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    console.log(`📤 Sending push notification to ${userIds.length} specific users...`);

    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      const success = await this.sendNotification(userId, title, body, data);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      // Rate limiting: 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Push notifications sent: ${successCount} succeeded, ${failCount} failed`);
  }
}
