export interface Letter {
  id: string;
  userId: string;
  title: string;
  content: string;
  year: number;
  month: number;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}
