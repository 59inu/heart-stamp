import { Expo, ExpoPushMessage } from 'expo-server-sdk';

export class PushNotificationService {
  private expo: Expo;
  private pushTokens: Set<string> = new Set();

  constructor() {
    this.expo = new Expo();
  }

  // 푸시 토큰 등록
  registerToken(token: string) {
    if (Expo.isExpoPushToken(token)) {
      this.pushTokens.add(token);
      console.log('📱 푸시 토큰 등록:', token);
      return true;
    }
    console.error('유효하지 않은 푸시 토큰:', token);
    return false;
  }

  // 푸시 토큰 제거
  unregisterToken(token: string) {
    this.pushTokens.delete(token);
  }

  // 모든 사용자에게 푸시 알림 전송
  async sendToAll(title: string, body: string, data?: any) {
    if (this.pushTokens.size === 0) {
      console.log('📭 등록된 푸시 토큰이 없습니다');
      return;
    }

    const messages: ExpoPushMessage[] = Array.from(this.pushTokens).map(
      (token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      })
    );

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          console.log('📬 푸시 알림 전송 완료:', ticketChunk.length);
        } catch (error) {
          console.error('푸시 알림 전송 오류:', error);
        }
      }

      return tickets;
    } catch (error) {
      console.error('푸시 알림 처리 오류:', error);
      return [];
    }
  }

  // AI 코멘트 완료 알림 전송
  async sendAICommentNotification() {
    return await this.sendToAll(
      '도장 일기 📔',
      '밤 사이 선생님이 일기장을 확인했어요',
      { type: 'ai_comment_complete' }
    );
  }

  // 등록된 토큰 수 확인
  getTokenCount(): number {
    return this.pushTokens.size;
  }
}
