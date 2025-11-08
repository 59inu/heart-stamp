import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DiaryEntry, WeatherType, MoodType } from '../../../models/DiaryEntry';
import { DiaryStorage } from '../../../services/diaryStorage';
import { WeatherService } from '../../../services/weatherService';
import { logger } from '../../../utils/logger';

interface UseLoadEntryParams {
  entryId?: string;
  selectedDate: Date;
  fetchWeather: () => Promise<void>;
  setWeather: (weather: WeatherType | null) => void;
}

interface UseLoadEntryReturn {
  content: string;
  setContent: (content: string) => void;
  existingEntry: DiaryEntry | null;
  setExistingEntry: (entry: DiaryEntry | null) => void;
  selectedMood: MoodType | null;
  setSelectedMood: (mood: MoodType | null) => void;
  selectedMoodTag: string | null;
  setSelectedMoodTag: (tag: string | null) => void;
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  loadingEntry: boolean;
}

export const useLoadEntry = ({
  entryId,
  selectedDate,
  fetchWeather,
  setWeather,
}: UseLoadEntryParams): UseLoadEntryReturn => {
  const [content, setContent] = useState('');
  const [existingEntry, setExistingEntry] = useState<DiaryEntry | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [selectedMoodTag, setSelectedMoodTag] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);

  useEffect(() => {
    let cancelled = false; // 컴포넌트 언마운트 감지

    const loadEntry = async () => {
      if (entryId) {
        if (!cancelled) setLoadingEntry(true);

        // entryId가 있으면 해당 일기 불러오기
        const entry = await DiaryStorage.getById(entryId);

        if (cancelled) return; // 언마운트되었으면 setState 하지 않음

        if (entry) {
          setExistingEntry(entry);
          setContent(entry.content);
          setWeather(entry.weather || null);
          setSelectedMood(entry.mood || null);
          setSelectedMoodTag(entry.moodTag || null);

          // 이미지 URI 로드 및 로깅
          const loadedImageUri = entry.imageUri || null;
          logger.log('📸 이미지 URI 로드:', loadedImageUri);
          setImageUri(loadedImageUri);
        }
        setLoadingEntry(false);
      } else {
        // entryId가 없으면 날짜로 기존 일기 확인
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const allEntries = await DiaryStorage.getAll();

        if (cancelled) return; // 언마운트되었으면 setState 하지 않음

        const existingForDate = allEntries.find(
          (e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr
        );

        if (existingForDate) {
          // 해당 날짜에 일기가 있으면 수정 모드로 전환
          setExistingEntry(existingForDate);
          setContent(existingForDate.content);
          setWeather(existingForDate.weather || null);
          setSelectedMood(existingForDate.mood || null);
          setSelectedMoodTag(existingForDate.moodTag || null);
          setImageUri(existingForDate.imageUri || null);
        } else {
          // 새 일기: 오늘 날짜일 때만 자동으로 현재 날씨 가져오기
          const today = format(new Date(), 'yyyy-MM-dd');
          const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
          if (selectedDateStr === today) {
            fetchWeather();
          }
        }
      }
    };

    loadEntry();

    // Cleanup: 컴포넌트 언마운트 시 비동기 작업 취소
    return () => {
      cancelled = true;
    };
  }, [entryId, selectedDate, fetchWeather]);

  return {
    content,
    setContent,
    existingEntry,
    setExistingEntry,
    selectedMood,
    setSelectedMood,
    selectedMoodTag,
    setSelectedMoodTag,
    imageUri,
    setImageUri,
    loadingEntry,
  };
};
