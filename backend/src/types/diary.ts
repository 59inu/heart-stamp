export type StampType = 'excellent' | 'good' | 'nice' | 'keep_going';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';

export interface DiaryEntry {
  _id: string;
  date: string;
  content: string;
  weather?: WeatherType;
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
