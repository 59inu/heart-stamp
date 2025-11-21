import { useState } from 'react';
import { Alert } from 'react-native';
import { format } from 'date-fns';
import { DiaryEntry, WeatherType, MoodType } from '../../../models/DiaryEntry';
import { DiaryStorage } from '../../../services/diaryStorage';
import { apiService } from '../../../services/apiService';
import { SyncQueue } from '../../../services/syncQueue';
import { SurveyService } from '../../../services/surveyService';
import { SURVEY_TRIGGER_COUNT } from '../../../constants/survey';
import { logger } from '../../../utils/logger';
import { AnalyticsService } from '../../../services/analyticsService';
import { RetentionService } from '../../../services/retentionService';

interface UseDiarySaveParams {
  existingEntry: DiaryEntry | null;
  selectedDate: Date;
  content: string;
  weather: WeatherType | null;
  selectedMood: MoodType | null;
  selectedMoodTag: string | null;
  imageUri: string | null;
  aiGenerateSelected: boolean;
  onSaveComplete: (shouldShowSurvey: boolean) => void;
}

interface UseDiarySaveReturn {
  showMoodModal: boolean;
  setShowMoodModal: (show: boolean) => void;
  handleSave: () => void;
  handleMoodSave: () => Promise<void>;
}

export const useDiarySave = ({
  existingEntry,
  selectedDate,
  content,
  weather,
  selectedMood,
  selectedMoodTag,
  imageUri,
  aiGenerateSelected,
  onSaveComplete,
}: UseDiarySaveParams): UseDiarySaveReturn => {
  const [showMoodModal, setShowMoodModal] = useState(false);

  const handleSave = () => {
    if (!content.trim()) {
      Alert.alert('알림', '일기 내용을 입력해주세요.');
      return;
    }

    // 기분 선택 모달 표시
    // 최초 작성 시 기본값 설정 (긍정 = green)
    setShowMoodModal(true);
  };

  const handleMoodSave = async () => {
    logger.debug('저장 시 선택된 mood:', selectedMood);
    logger.debug('저장 시 선택된 moodTag:', selectedMoodTag);

    let savedEntry: DiaryEntry;

    if (existingEntry) {
      const updateData = {
        content,
        weather: weather || undefined,
        mood: selectedMood || undefined,
        moodTag: selectedMoodTag || undefined,
        imageUri: imageUri || undefined,
        syncedWithServer: false,
      };
      logger.debug('업데이트할 데이터:', updateData);
      const updated = await DiaryStorage.update(existingEntry._id, updateData);
      logger.debug('업데이트된 엔트리:', updated);
      savedEntry = updated!;
    } else {
      // 날짜를 사용자 로컬 날짜 기준 자정 UTC로 정규화
      // 예: 2025-11-09 23:00 KST → 2025-11-09 00:00:00.000Z
      const normalizedDate = new Date(
        Date.UTC(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        )
      );

      const createData = {
        date: normalizedDate.toISOString(),
        content,
        weather: weather || undefined,
        mood: selectedMood || undefined,
        moodTag: selectedMoodTag || undefined,
        imageUri: imageUri || undefined,
        syncedWithServer: false,
      };
      logger.debug('생성할 데이터:', createData);
      savedEntry = await DiaryStorage.create(createData);
      logger.debug('생성된 엔트리:', savedEntry);

      // 새 일기 작성 시에만 카운트 증가
      const newCount = await SurveyService.incrementDiaryCount();
      logger.log(`📝 일기 작성 횟수: ${newCount}`);
    }

    // Upload to server (AI 생성 선택된 경우 플래그 전달)
    // DEV: 개발 중에는 수정 모드에서도 이미지 생성 허용
    const shouldGenerateImage = aiGenerateSelected;
    const uploadResult = await apiService.uploadDiary(savedEntry, shouldGenerateImage);
    if (uploadResult.success) {
      await DiaryStorage.update(savedEntry._id, {
        syncedWithServer: true,
      });
    } else {
      // 크레딧 제한 에러 처리
      if (uploadResult.errorCode === 'CREDIT_LIMIT_EXCEEDED') {
        logger.warn('그림일기 크레딧 부족:', uploadResult.data);
        Alert.alert(
          '그림일기 크레딧 부족',
          uploadResult.error,
          [{ text: '확인' }]
        );
        // 일기는 저장되었지만 이미지 생성은 안 됨
        await DiaryStorage.update(savedEntry._id, {
          syncedWithServer: true, // 일기 자체는 업로드 성공
        });
        // 모달 닫기
        setShowMoodModal(false);
        onSaveComplete(false);
        return;
      }

      logger.error('일기 업로드 실패:', uploadResult.error);
      // 로컬에는 저장되었지만 서버 업로드 실패를 표시
      await DiaryStorage.update(savedEntry._id, {
        syncedWithServer: false,
      });

      // 오프라인 큐에 추가하여 나중에 자동 재시도
      await SyncQueue.add('upload_diary', savedEntry);
      logger.log('📥 [useDiarySave] Added to sync queue for retry');
    }

    // Analytics: 일기 저장 이벤트 (리텐션의 핵심 지표!)
    await AnalyticsService.logDiarySave(savedEntry, !existingEntry);

    // Retention: 리텐션 지표 업데이트 (연속 작성 일수 등)
    await RetentionService.updateAfterDiarySave();

    // 모달 닫기
    setShowMoodModal(false);

    // 설문조사 모달 체크 (새 일기 작성 시에만)
    let shouldShowSurvey = false;
    if (!existingEntry) {
      const hasShown = await SurveyService.hasShownSurvey();
      const diaryCount = await SurveyService.getDiaryWriteCount();

      if (!hasShown && diaryCount >= SURVEY_TRIGGER_COUNT) {
        shouldShowSurvey = true;
      }
    }

    // 저장 완료 - 상세 화면으로 이동 (Alert 없이)
    // 상세 화면에서 imageGenerationStatus를 표시
    onSaveComplete(shouldShowSurvey);
  };

  return {
    showMoodModal,
    setShowMoodModal,
    handleSave,
    handleMoodSave,
  };
};
