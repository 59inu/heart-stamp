export type StampType = 'excellent' | 'good' | 'nice' | 'keep_going' | null;

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';

export interface DiaryEntry {
  _id: string;
  date: string; // ISO string
  content: string;
  weather?: WeatherType;
  aiComment?: string;
  stampType?: StampType;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  syncedWithServer: boolean;
}
