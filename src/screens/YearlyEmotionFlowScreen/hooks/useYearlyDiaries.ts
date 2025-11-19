import { useState, useEffect, useCallback } from 'react';
import { DiaryEntry } from '../../../models/DiaryEntry';
import { DiaryStorage } from '../../../services/diaryStorage';

export const useYearlyDiaries = (year: number) => {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadYearlyDiaries = useCallback(async () => {
    setLoading(true);
    try {
      // 모든 일기를 가져온 후 해당 연도만 필터링
      const allDiaries = await DiaryStorage.getAll();
      const yearlyDiaries = allDiaries.filter((diary) => {
        const diaryYear = new Date(diary.date).getFullYear();
        return diaryYear === year;
      });
      setDiaries(yearlyDiaries);
    } catch (error) {
      console.error('Error loading yearly diaries:', error);
      setDiaries([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadYearlyDiaries();
  }, [loadYearlyDiaries]);

  return {
    diaries,
    loading,
    reload: loadYearlyDiaries,
  };
};
