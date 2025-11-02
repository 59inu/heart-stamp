export type NotificationType = 'ai_comment';

export interface Notification {
  _id: string;
  type: NotificationType;
  diaryId: string;
  diaryDate: string; // 일기 날짜 (표시용)
  message: string; // "월/일 일기를 선생님이 확인했어요"
  isRead: boolean;
  createdAt: string;
}
