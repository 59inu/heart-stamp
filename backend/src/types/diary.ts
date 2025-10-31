export type StampType = 'excellent' | 'good' | 'nice' | 'keep_going';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
export type MoodType = 'red' | 'yellow' | 'green';

export interface DiaryEntry {
  _id: string;
  date: string;
  content: string;
  weather?: WeatherType;
  mood?: MoodType;
  moodTag?: string;
  aiComment?: string;
  stampType?: StampType;
  createdAt: string;
  updatedAt: string;
  syncedWithServer: boolean;
}

export interface AIAnalysisResult {
  comment: string;
  stampType: StampType;
}
