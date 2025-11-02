export type ReportPeriod = 'weekly' | 'monthly';

export interface MoodDistribution {
  red: number;
  yellow: number;
  green: number;
  total: number;
  percentages: {
    red: number;
    yellow: number;
    green: number;
  };
}

export interface KeywordWithCount {
  keyword: string;
  count: number;
}

export interface Report {
  _id: string;
  userId: string;
  period: ReportPeriod;
  year: number;
  week?: number; // 주간 리포트일 때만
  month?: number; // 월간 리포트일 때만 (1-12)
  startDate: string; // ISO string
  endDate: string; // ISO string
  keywords: KeywordWithCount[]; // AI가 추출한 감정 키워드와 빈도수
  moodDistribution: MoodDistribution;
  summary: string; // AI가 생성한 요약 메시지
  insight: string; // AI가 생성한 인사이트 메시지
  diaryCount: number; // 해당 기간의 일기 개수
  createdAt: string;
  updatedAt: string; // 업데이트 타임스탬프
  deletedAt?: string; // 소프트 삭제 타임스탬프
  version: number; // 충돌 해결용 버전 번호 (Last-Write-Wins)
}

export interface ReportGenerationRequest {
  userId: string;
  period: ReportPeriod;
  year: number;
  week?: number;
  month?: number;
}
