import { useMemo } from 'react';
import { DiaryEntry } from '../../../models/DiaryEntry';
import { getEmotionMessage } from '../../../constants/emotionMessages';

export const useMoodStats = (diaries: DiaryEntry[], currentDate: Date) => {
  // 현재 월의 신호등 통계
  const currentMonthMoodStats = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // 현재 월의 일기들만 필터링
    const monthDiaries = diaries.filter((diary) => {
      const diaryDate = new Date(diary.date);
      return (
        diaryDate.getFullYear() === currentYear &&
        diaryDate.getMonth() === currentMonth &&
        diary.mood // 신호등이 있는 일기만
      );
    });

    const total = monthDiaries.length;
    if (total === 0) {
      return { red: 0, yellow: 0, green: 0, total: 0 };
    }

    const red = monthDiaries.filter((d) => d.mood === 'red').length;
    const yellow = monthDiaries.filter((d) => d.mood === 'yellow').length;
    const green = monthDiaries.filter((d) => d.mood === 'green').length;

    return { red, yellow, green, total };
  }, [diaries, currentDate]);

  // 이달의 감정 요약 문구
  const moodSummaryText = useMemo(() => {
    const { red, yellow, green, total } = currentMonthMoodStats;
    if (total === 0) return null;

    const today = new Date();
    const focusedMonth = currentDate.getMonth();
    const focusedYear = currentDate.getFullYear();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 포커싱된 달이 현재 달인 경우: 오늘 날짜 기준
    // 포커싱된 달이 과거 달인 경우: 말일(end) 기준
    // 포커싱된 달이 미래 달인 경우: 초반(start) 기준
    let dayForPeriod: number;

    if (focusedYear === currentYear && focusedMonth === currentMonth) {
      dayForPeriod = today.getDate();
    } else if (
      focusedYear < currentYear ||
      (focusedYear === currentYear && focusedMonth < currentMonth)
    ) {
      // 과거 달: 말일 기준 (21-31)
      dayForPeriod = 25;
    } else {
      // 미래 달: 초반 기준 (1-10)
      dayForPeriod = 5;
    }

    return getEmotionMessage(red, yellow, green, dayForPeriod);
  }, [currentMonthMoodStats, currentDate]);

  return {
    currentMonthMoodStats,
    moodSummaryText,
  };
};
