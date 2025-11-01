import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { Report, ReportPeriod, MoodDistribution, KeywordWithCount } from '../types/report';
import { DiaryEntry } from '../types/diary';
import { DiaryDatabase } from './database';
import { ReportDatabase } from './reportDatabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export class ReportService {
  private anthropic: Anthropic | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  // 감정 분포 계산
  private calculateMoodDistribution(diaries: DiaryEntry[]): MoodDistribution {
    const withMood = diaries.filter((d) => d.mood);
    const total = withMood.length;

    if (total === 0) {
      return {
        red: 0,
        yellow: 0,
        green: 0,
        total: 0,
        percentages: { red: 0, yellow: 0, green: 0 },
      };
    }

    const red = withMood.filter((d) => d.mood === 'red').length;
    const yellow = withMood.filter((d) => d.mood === 'yellow').length;
    const green = withMood.filter((d) => d.mood === 'green').length;

    return {
      red,
      yellow,
      green,
      total,
      percentages: {
        red: Math.round((red / total) * 100),
        yellow: Math.round((yellow / total) * 100),
        green: Math.round((green / total) * 100),
      },
    };
  }

  // AI로 키워드 및 요약 생성
  private async generateReportWithAI(
    diaries: DiaryEntry[],
    period: ReportPeriod,
    startDate: string,
    endDate: string
  ): Promise<{ keywords: KeywordWithCount[]; summary: string; insight: string }> {
    if (!this.anthropic) {
      // Mock 데이터 (개발/테스트용)
      return this.generateMockReport(diaries, period);
    }

    const periodLabel = period === 'weekly' ? '일주일' : '한 달';
    const diariesText = diaries
      .map((d, i) => {
        const dateStr = format(new Date(d.date), 'M월 d일', { locale: ko });
        return `[${dateStr}]\n${d.content}\n기분: ${d.mood || '없음'}, 감정: ${d.moodTag || '없음'}`;
      })
      .join('\n\n---\n\n');

    const prompt = `다음은 사용자가 ${periodLabel} 동안 작성한 일기입니다.

${diariesText}

이 일기들을 분석하여 다음 항목을 JSON 형식으로 작성해주세요:

1. keywords: 가장 자주 등장하거나 중요한 감정/상황 키워드 3-5개 (배열)
2. summary: ${periodLabel} 동안의 주요 감정과 경험을 간단히 요약한 한 문장 (예: "성취와 피로 사이에서 균형을 찾으려 노력했어요.")
3. insight: 사용자에게 공감하고 격려하는 따뜻한 메시지 1-2문장

JSON 형식:
{
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "summary": "요약 문장",
  "insight": "인사이트 메시지"
}`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          const aiKeywords: string[] = result.keywords || [];

          // AI가 추출한 키워드의 실제 출현 빈도 계산
          const tagCounts: { [tag: string]: number } = {};
          diaries.forEach((diary) => {
            if (diary.moodTag) {
              tagCounts[diary.moodTag] = (tagCounts[diary.moodTag] || 0) + 1;
            }
          });

          // AI 키워드에 실제 빈도수 매칭
          const keywords: KeywordWithCount[] = aiKeywords.map((keyword) => ({
            keyword,
            count: tagCounts[keyword] || 0,
          }));

          return {
            keywords,
            summary: result.summary || '',
            insight: result.insight || '',
          };
        }
      }

      return this.generateMockReport(diaries, period);
    } catch (error) {
      console.error('AI 리포트 생성 실패:', error);
      return this.generateMockReport(diaries, period);
    }
  }

  // Mock 리포트 생성 (AI 없을 때)
  private generateMockReport(
    diaries: DiaryEntry[],
    period: ReportPeriod
  ): { keywords: KeywordWithCount[]; summary: string; insight: string } {
    // 감정 태그 빈도수 계산
    const tagCounts: { [tag: string]: number } = {};
    diaries.forEach((diary) => {
      if (diary.moodTag) {
        tagCounts[diary.moodTag] = (tagCounts[diary.moodTag] || 0) + 1;
      }
    });

    const keywords = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ keyword: tag, count }));

    const periodLabel = period === 'weekly' ? '이번 주' : '이번 달';
    const keywordsText = keywords.slice(0, 3).map((k) => `'${k.keyword}'`).join(', ');

    return {
      keywords,
      summary: keywords.length > 0
        ? `${periodLabel}에는 ${keywordsText}${keywords.length === 3 ? '이라는' : '라는'} 키워드가 자주 등장했어요.`
        : `${periodLabel}의 감정을 기록했어요.`,
      insight: `${periodLabel}엔 '만족'과 '피로'가 함께 보이네요. ${periodLabel}는 평온하면서도 약간 지쳤던 ${period === 'weekly' ? '주' : '달'}였어요.`,
    };
  }

  // 주간/월간 리포트 생성
  async generateReport(
    userId: string,
    period: ReportPeriod,
    year: number,
    week?: number,
    month?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<Report> {
    // 해당 기간의 일기 조회
    const allDiaries = DiaryDatabase.getAllByUserId(userId);

    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

    const periodDiaries = allDiaries.filter((diary) => {
      const diaryDate = new Date(diary.date);
      return diaryDate >= startDate && diaryDate <= endDate;
    });

    // 감정 분포 계산
    const moodDistribution = this.calculateMoodDistribution(periodDiaries);

    // AI로 키워드 및 요약 생성
    const aiResult = await this.generateReportWithAI(
      periodDiaries,
      period,
      startDate.toISOString(),
      endDate.toISOString()
    );

    // 리포트 생성
    const report: Report = {
      _id: uuidv4(),
      userId,
      period,
      year,
      week,
      month,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      keywords: aiResult.keywords,
      moodDistribution,
      summary: aiResult.summary,
      insight: aiResult.insight,
      diaryCount: periodDiaries.length,
      createdAt: new Date().toISOString(),
    };

    // DB에 저장
    ReportDatabase.create(report);

    return report;
  }

  // 주간 리포트 조회 또는 생성
  async getOrCreateWeeklyReport(
    userId: string,
    year: number,
    week: number,
    startDate: Date,
    endDate: Date
  ): Promise<Report> {
    // 기존 리포트 확인
    const existing = ReportDatabase.getWeeklyReport(userId, year, week);
    if (existing) {
      return existing;
    }

    // 없으면 생성
    return this.generateReport(userId, 'weekly', year, week, undefined, startDate, endDate);
  }

  // 월간 리포트 조회 또는 생성
  async getOrCreateMonthlyReport(
    userId: string,
    year: number,
    month: number,
    startDate: Date,
    endDate: Date
  ): Promise<Report> {
    // 기존 리포트 확인
    const existing = ReportDatabase.getMonthlyReport(userId, year, month);
    if (existing) {
      return existing;
    }

    // 없으면 생성
    return this.generateReport(userId, 'monthly', year, undefined, month, startDate, endDate);
  }
}
