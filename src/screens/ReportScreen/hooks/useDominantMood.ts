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

    // 이전 리포트가 있으면 상승폭이 가장 큰 감정 찾기
    if (previousReport && previousReport.moodDistribution.total > 0) {
      const prevPercentages = previousReport.moodDistribution.percentages;

      // 각 감정의 변화량 계산 (증가는 양수, 감소는 음수)
      const changes = {
        red: percentages.red - prevPercentages.red,
        yellow: percentages.yellow - prevPercentages.yellow,
        green: percentages.green - prevPercentages.green,
      };

      // 상승폭이 가장 큰 감정 찾기
      let maxIncreaseMood: 'red' | 'yellow' | 'green' = 'green';
      let maxIncrease = changes.green;

      if (changes.red > maxIncrease) {
        maxIncreaseMood = 'red';
        maxIncrease = changes.red;
      }
      if (changes.yellow > maxIncrease) {
        maxIncreaseMood = 'yellow';
        maxIncrease = changes.yellow;
      }

      const currentPercentage = percentages[maxIncreaseMood];
      const previousPercentage = prevPercentages[maxIncreaseMood];
      const diff = currentPercentage - previousPercentage;

      return {
        mood: maxIncreaseMood,
        name: moodNames[maxIncreaseMood],
        percentage: currentPercentage,
        change: Math.abs(diff) >= 1 ? {
          value: Math.abs(diff),
          isIncrease: diff > 0,
        } : null,
      };
    }

    // 이전 리포트가 없으면 가장 많은 감정 표시
    let dominantMood: 'red' | 'yellow' | 'green' = 'green';
    let dominantPercentage = percentages.green;

    if (percentages.red > dominantPercentage) {
      dominantMood = 'red';
      dominantPercentage = percentages.red;
    }
    if (percentages.yellow > dominantPercentage) {
      dominantMood = 'yellow';
      dominantPercentage = percentages.yellow;
    }

    return {
      mood: dominantMood,
      name: moodNames[dominantMood],
      percentage: dominantPercentage,
      change: null,
    };
  }, [report, previousReport]);
};
