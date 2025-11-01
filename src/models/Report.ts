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
  week?: number;
  month?: number;
  startDate: string;
  endDate: string;
  keywords: KeywordWithCount[];
  moodDistribution: MoodDistribution;
  summary: string;
  insight: string;
  diaryCount: number;
  createdAt: string;
}
