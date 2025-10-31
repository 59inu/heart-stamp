export type StampType = 'excellent' | 'good' | 'nice' | 'keep_going' | null;

export interface DiaryEntry {
  _id: string;
  date: string; // ISO string
  content: string;
  aiComment?: string;
  stampType?: StampType;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  syncedWithServer: boolean;
}
