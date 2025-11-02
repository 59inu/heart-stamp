export type StampType = 'excellent' | 'good' | 'nice' | 'keep_going';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
export type MoodType = 'red' | 'yellow' | 'green';

export interface DiaryEntry {
  _id: string;
  userId?: string;
  date: string;
  content: string;
  weather?: WeatherType;
  mood?: MoodType;
  moodTag?: string;
  imageUri?: string;
  aiComment?: string;
  stampType?: StampType;
  createdAt: string;
  updatedAt: string;
  syncedWithServer: boolean;
  deletedAt?: string; // 소프트 삭제 타임스탬프
  version: number; // 충돌 해결용 버전 번호 (Last-Write-Wins)
}

export interface AIAnalysisResult {
  comment: string;
  stampType: StampType;
}
