import { useState } from 'react';
import { Alert } from 'react-native';
import { format } from 'date-fns';
import { DiaryEntry, WeatherType, MoodType } from '../../../models/DiaryEntry';
import { DiaryStorage } from '../../../services/diaryStorage';
import { apiService } from '../../../services/apiService';
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
      const createData = {
        date: selectedDate.toISOString(),
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

    // Upload to server
    const uploadResult = await apiService.uploadDiary(savedEntry);
    if (uploadResult.success) {
      await DiaryStorage.update(savedEntry._id, {
        syncedWithServer: true,
      });
    } else {
      logger.error('일기 업로드 실패:', uploadResult.error);
      // 로컬에는 저장되었지만 서버 업로드 실패를 표시
      await DiaryStorage.update(savedEntry._id, {
        syncedWithServer: false,
      });
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

    // 과거 날짜인지 확인 (실제 저장된 일기의 날짜 기준)
    const today = format(new Date(), 'yyyy-MM-dd');
    const diaryDate = format(new Date(savedEntry.date), 'yyyy-MM-dd');
    const isPastDate = diaryDate < today;

    // 메시지 결정
    let title = '저장 완료';
    let message = isPastDate
      ? '일기가 저장되었습니다.\n분명 훗날 읽으며 웃고 울게 될거에요. 💚'
      : '일기가 저장되었습니다.\n밤 사이 선생님이 코멘트를 달아줄 거예요! 🌙';

    // 서버 업로드 실패 시 메시지 추가
    if (!uploadResult.success) {
      title = '로컬 저장 완료';
      message += `\n\n⚠️ 서버 업로드 실패: ${uploadResult.error}\n다음 동기화 시 자동으로 재시도됩니다.`;
    }

    // 저장 완료 Alert 먼저 표시
    Alert.alert(title, message, [
      {
        text: '확인',
        onPress: () => onSaveComplete(shouldShowSurvey),
      },
    ]);
  };

  return {
    showMoodModal,
    setShowMoodModal,
    handleSave,
    handleMoodSave,
  };
};
