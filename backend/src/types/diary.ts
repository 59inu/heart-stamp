export type StampType = 'excellent' | 'good' | 'nice' | 'keep_going';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
export type MoodType = 'red' | 'yellow' | 'green';

export type ImageGenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface DiaryEntry {
  _id: string;
  userId?: string;
  date: string;
  content: string;
  weather?: WeatherType;
  mood?: MoodType;
  moodTag?: string;
  imageUri?: string;
  imageGenerationStatus?: ImageGenerationStatus; // 이미지 생성 상태
  aiComment?: string;
  stampType?: StampType;
  model?: 'haiku' | 'sonnet'; // AI 모델 종류 (통계용)
  importanceScore?: number; // 중요도 점수 0-40 (통계용)
  createdAt: string;
  updatedAt: string;
  syncedWithServer: boolean;
  deletedAt?: string; // 소프트 삭제 타임스탬프
  version: number; // 충돌 해결용 버전 번호 (Last-Write-Wins)
}

export interface AIAnalysisResult {
  comment: string;
  stampType: StampType;
  model?: 'haiku' | 'sonnet'; // 사용된 모델
  importanceScore?: number; // 중요도 점수 (0-40)
}

export interface ImportanceScore {
  emotional_intensity: number; // 0-10
  significant_event: number; // 0-10
  depth_of_reflection: number; // 0-10
  change_signal: number; // 0-10
  total: number; // 합계
  reason: string; // 간단한 이유
}
