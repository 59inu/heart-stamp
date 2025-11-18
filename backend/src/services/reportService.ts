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
      throw new Error('ANTHROPIC_API_KEY is not configured');
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

1. keywords: 주요 감정 키워드 (배열)
   - 먼저 사용자가 선택한 '감정' 태그를 우선적으로 참고하여 일기를 분석하세요.
   - 그 다음 일기 본문의 내용과 맥락을 고려하세요
   - 일기에 직접 등장하지 않더라도, 전체적인 감정과 분위기를 잘 표현하는 키워드를 선택하세요
   - 단, 일기 내용과 **완전히 무관하거나 반대되는** 키워드는 피하세요
   - 일기 개수가 적거나 내용이 부족하면 1-2개 정도만 추출해도 됩니다
   - 구체적인 단어를 사용하고, 2-4글자의 명사형으로 작성

2. summary: ${periodLabel} 동안의 주요 감정과 경험을 간단히 요약한 한 문장
   - 예: "성취와 피로 사이에서 균형을 찾으려 노력했어요."

3. insight: 사용자에게 공감하고 격려하는 따뜻한 메시지 1-2문장
   - 선생님이 학생에게 따뜻하게 격려하는 톤으로 작성

JSON 형식 (키워드는 2-3개 정도):
{
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "summary": "요약 문장",
  "insight": "인사이트 메시지"
}`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
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
          // 1. moodTag에서 빈도수 확인
          const tagCounts: { [tag: string]: number } = {};
          diaries.forEach((diary) => {
            if (diary.moodTag) {
              tagCounts[diary.moodTag] = (tagCounts[diary.moodTag] || 0) + 1;
            }
          });

          // 2. AI 키워드가 일기 본문에 등장하는 빈도수 계산
          const keywords: KeywordWithCount[] = aiKeywords.slice(0, 3).map((keyword) => {
            // moodTag에 있으면 그 빈도수 사용
            if (tagCounts[keyword]) {
              return { keyword, count: tagCounts[keyword] };
            }

            // 없으면 본문에서 해당 키워드가 등장하는 일기 개수 카운트
            const count = diaries.filter((diary) =>
              diary.content.includes(keyword)
            ).length;

            // AI가 의미적으로 판단한 키워드이므로 최소 1개로 표시
            return { keyword, count: count || 1 };
          });

          return {
            keywords,
            summary: result.summary || '',
            insight: result.insight || '',
          };
        }
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('AI 리포트 생성 실패:', error);
      throw error;
    }
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
    const allDiaries = await DiaryDatabase.getAllByUserId(userId);

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
    const now = new Date().toISOString();
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
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // DB에 저장
    await ReportDatabase.create(report);

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
    const existing = await ReportDatabase.getWeeklyReport(userId, year, week);
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
    const existing = await ReportDatabase.getMonthlyReport(userId, year, month);
    if (existing) {
      return existing;
    }

    // 없으면 생성
    return this.generateReport(userId, 'monthly', year, undefined, month, startDate, endDate);
  }
}
