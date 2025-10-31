export type StampType = 'excellent' | 'good' | 'nice' | 'keep_going' | null;

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';

export type MoodType = 'red' | 'yellow' | 'green';

export interface DiaryEntry {
  _id: string;
  userId?: string; // 익명 사용자 ID (UUID)
  date: string; // ISO string
  content: string;
  weather?: WeatherType;
  mood?: MoodType; // 신호등 색상
  moodTag?: string; // 감정 태그
  aiComment?: string;
  stampType?: StampType;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  syncedWithServer: boolean;
}
