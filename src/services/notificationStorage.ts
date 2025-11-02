import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from '../models/Notification';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const STORAGE_KEY = '@stamp_diary:notifications';

export class NotificationStorage {
  private static async getAllNotifications(): Promise<Notification[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  private static async saveAllNotifications(notifications: Notification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
      throw error;
    }
  }

  /**
   * 모든 알림 가져오기 (최신순)
   */
  static async getAll(): Promise<Notification[]> {
    const notifications = await this.getAllNotifications();
    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * 읽지 않은 알림 개수
   */
  static async getUnreadCount(): Promise<number> {
    const notifications = await this.getAllNotifications();
    return notifications.filter((n) => !n.isRead).length;
  }

  /**
   * AI 코멘트 알림 추가
   */
  static async addAICommentNotification(diaryId: string, diaryDate: string): Promise<Notification> {
    const notifications = await this.getAllNotifications();

    // 중복 방지: 같은 diaryId의 알림이 이미 있으면 추가하지 않음
    const existing = notifications.find(
      (n) => n.diaryId === diaryId && n.type === 'ai_comment'
    );
    if (existing) {
      console.log(`알림이 이미 존재합니다: ${diaryId}`);
      return existing;
    }

    // 날짜 포맷팅: "10월 31일"
    const formattedDate = format(new Date(diaryDate), 'M월 d일', { locale: ko });

    const newNotification: Notification = {
      _id: this.generateId(),
      type: 'ai_comment',
      diaryId,
      diaryDate,
      message: `${formattedDate} 일기를 선생님이 확인했어요`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    notifications.push(newNotification);
    await this.saveAllNotifications(notifications);

    console.log(`✅ 알림 추가됨: ${newNotification.message}`);
    return newNotification;
  }

  /**
   * 알림 읽음 처리
   */
  static async markAsRead(id: string): Promise<void> {
    const notifications = await this.getAllNotifications();
    const notification = notifications.find((n) => n._id === id);

    if (notification) {
      notification.isRead = true;
      await this.saveAllNotifications(notifications);
    }
  }

  /**
   * 모든 알림 읽음 처리
   */
  static async markAllAsRead(): Promise<void> {
    const notifications = await this.getAllNotifications();
    notifications.forEach((n) => (n.isRead = true));
    await this.saveAllNotifications(notifications);
  }

  /**
   * 알림 삭제
   */
  static async delete(id: string): Promise<boolean> {
    const notifications = await this.getAllNotifications();
    const filtered = notifications.filter((n) => n._id !== id);

    if (filtered.length === notifications.length) {
      return false;
    }

    await this.saveAllNotifications(filtered);
    return true;
  }

  /**
   * 모든 알림 삭제
   */
  static async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('✅ All notifications cleared');
  }

  private static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
