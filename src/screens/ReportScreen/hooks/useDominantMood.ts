import { useMemo } from 'react';
import { Report } from '../../../models/Report';

export const useDominantMood = (report: Report | null, previousReport: Report | null) => {
  return useMemo(() => {
    if (!report || report.moodDistribution.total === 0) return null;

    const percentages = report.moodDistribution.percentages;

    // 신호등 이름 매핑
    const moodNames = {
      red: '부정',
      yellow: '중립',
      green: '긍정',
    };

    // 모든 감정을 배열로 만들고 비율이 높은 순서대로 정렬
    const allMoods = [
      {
        mood: 'red' as const,
        name: moodNames.red,
        percentage: percentages.red,
      },
      {
        mood: 'yellow' as const,
        name: moodNames.yellow,
        percentage: percentages.yellow,
      },
      {
        mood: 'green' as const,
        name: moodNames.green,
        percentage: percentages.green,
      },
    ].sort((a, b) => b.percentage - a.percentage);

    // 가장 높은 비율 찾기
    const maxPercentage = allMoods[0].percentage;

    // 가장 높은 비율을 가진 모든 감정만 필터링 (동률 처리)
    const dominantMoods = allMoods.filter(mood => mood.percentage === maxPercentage);

    return dominantMoods;
  }, [report, previousReport]);
};
