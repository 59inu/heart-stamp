import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { PushTokenDatabase } from './database';

const expo = new Expo();

// Ticket ID와 userId 매핑을 위한 인메모리 저장소
// 프로덕션에서는 Redis나 DB에 저장하는 것을 권장
const ticketToUserIdMap = new Map<string, string>();

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
    const token = await PushTokenDatabase.get(userId);
    if (!token) {
      console.log(`⚠️ No push token found for user ${userId}`);
      return false;
    }

    if (!Expo.isExpoPushToken(token)) {
      console.error(`❌ Invalid Expo push token for user ${userId}: ${token}`);
      // 잘못된 토큰은 DB에서 제거
      await PushTokenDatabase.delete(userId);
      console.log(`🗑️  Removed invalid push token for user ${userId}`);
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
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      }

      // Ticket ID 저장 (나중에 receipt 확인용)
      for (const ticket of tickets) {
        if (ticket.status === 'ok' && ticket.id) {
          ticketToUserIdMap.set(ticket.id, userId);
          console.log(`📤 Push notification sent to user ${userId} (ticket: ${ticket.id})`);
        } else if (ticket.status === 'error') {
          console.error(`❌ Push ticket error for user ${userId}:`, ticket.message);

          // 에러 타입별 처리
          if (ticket.details?.error === 'DeviceNotRegistered') {
            console.log(`🗑️  Device not registered, removing token for user ${userId}`);
            await PushTokenDatabase.delete(userId);
          }
        }
      }

      return tickets.some(ticket => ticket.status === 'ok');
    } catch (error) {
      console.error(`❌ Failed to send push notification to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * 모든 사용자에게 일반 Push 알림 전송
   */
  static async sendNotificationToAll(title: string, body: string, data?: any): Promise<void> {
    const tokens = await PushTokenDatabase.getAll();
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

  /**
   * Push Notification Receipt 확인
   *
   * Expo 서버에서 알림 전송 결과를 확인하고 에러를 처리합니다.
   * 주기적으로 실행되어야 합니다 (예: 15분마다).
   */
  static async checkReceipts(): Promise<void> {
    const ticketIds = Array.from(ticketToUserIdMap.keys());

    if (ticketIds.length === 0) {
      console.log('ℹ️ No tickets to check');
      return;
    }

    console.log(`🔍 Checking ${ticketIds.length} push notification receipts...`);

    try {
      const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

      for (const chunk of receiptIdChunks) {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

        for (const receiptId in receipts) {
          const receipt: ExpoPushReceipt = receipts[receiptId];
          const userId = ticketToUserIdMap.get(receiptId);

          if (receipt.status === 'ok') {
            console.log(`✅ Receipt OK for ticket ${receiptId}`);
            // 성공한 receipt는 맵에서 제거
            ticketToUserIdMap.delete(receiptId);
          } else if (receipt.status === 'error') {
            console.error(`❌ Receipt error for ticket ${receiptId}:`, {
              message: receipt.message,
              details: receipt.details,
            });

            // 에러 타입별 처리
            const errorCode = receipt.details?.error;

            if (errorCode === 'DeviceNotRegistered') {
              // 디바이스가 등록 해제됨 → 토큰 삭제
              if (userId) {
                console.log(`🗑️  DeviceNotRegistered, removing token for user ${userId}`);
                await PushTokenDatabase.delete(userId);
              }
              ticketToUserIdMap.delete(receiptId);
            } else if (errorCode === 'MessageTooBig') {
              // 메시지가 너무 큼 → 로그만 남김
              console.error(`⚠️  MessageTooBig for ticket ${receiptId}`);
              ticketToUserIdMap.delete(receiptId);
            } else if (errorCode === 'MessageRateExceeded') {
              // Rate limit 초과 → 나중에 다시 시도 (맵에 유지)
              console.warn(`⏱️  MessageRateExceeded for ticket ${receiptId}, will retry later`);
            } else if (errorCode === 'InvalidCredentials') {
              // 잘못된 자격증명 → 심각한 문제, 로그 남김
              console.error(`🚨 InvalidCredentials for ticket ${receiptId}! Check Expo credentials!`);
              ticketToUserIdMap.delete(receiptId);
            } else {
              // 기타 에러 → 로그 남기고 제거
              console.error(`⚠️  Unknown error for ticket ${receiptId}: ${errorCode}`);
              ticketToUserIdMap.delete(receiptId);
            }
          }
        }
      }

      console.log(`✅ Receipt check completed. Remaining tickets: ${ticketToUserIdMap.size}`);
    } catch (error) {
      console.error('❌ Error checking receipts:', error);
    }
  }

  /**
   * Ticket 맵 통계 조회 (모니터링용)
   */
  static getTicketStats() {
    return {
      pendingTickets: ticketToUserIdMap.size,
      ticketIds: Array.from(ticketToUserIdMap.keys()),
    };
  }

  /**
   * Ticket 맵 초기화 (테스트/디버깅용)
   */
  static clearTicketMap() {
    const size = ticketToUserIdMap.size;
    ticketToUserIdMap.clear();
    console.log(`🗑️  Cleared ${size} tickets from map`);
  }
}
