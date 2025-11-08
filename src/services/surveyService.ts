import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const SURVEY_SHOWN_KEY = 'survey_modal_shown';
const DIARY_COUNT_KEY = 'diary_write_count';

export class SurveyService {
  // 설문조사 모달 표시 여부 확인
  static async hasShownSurvey(): Promise<boolean> {
    try {
      const shown = await AsyncStorage.getItem(SURVEY_SHOWN_KEY);
      return shown === 'true';
    } catch (error) {
      logger.error('Error checking survey shown:', error);
      return false;
    }
  }

  // 설문조사 모달 표시 완료로 마크
  static async markSurveyShown(): Promise<void> {
    try {
      await AsyncStorage.setItem(SURVEY_SHOWN_KEY, 'true');
    } catch (error) {
      logger.error('Error marking survey shown:', error);
    }
  }

  // 일기 작성 횟수 가져오기
  static async getDiaryWriteCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(DIARY_COUNT_KEY);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Error getting diary count:', error);
      return 0;
    }
  }

  // 일기 작성 횟수 증가
  static async incrementDiaryCount(): Promise<number> {
    try {
      const currentCount = await this.getDiaryWriteCount();
      const newCount = currentCount + 1;
      await AsyncStorage.setItem(DIARY_COUNT_KEY, newCount.toString());
      return newCount;
    } catch (error) {
      logger.error('Error incrementing diary count:', error);
      return 0;
    }
  }

  // 설문조사 완료 여부 확인
  static async hasCompletedSurvey(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem('survey_completed');
      return completed === 'true';
    } catch (error) {
      logger.error('Error checking survey completion:', error);
      return false;
    }
  }

  // 설문조사 완료로 마크
  static async markSurveyCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem('survey_completed', 'true');
    } catch (error) {
      logger.error('Error marking survey completed:', error);
    }
  }

  // 일기 개수를 실제 저장된 개수로 동기화 (초기화용)
  static async syncDiaryCount(actualCount: number): Promise<void> {
    try {
      const currentCount = await this.getDiaryWriteCount();
      // 현재 카운트가 실제보다 작으면 동기화
      if (currentCount < actualCount) {
        await AsyncStorage.setItem(DIARY_COUNT_KEY, actualCount.toString());
      }
    } catch (error) {
      logger.error('Error syncing diary count:', error);
    }
  }

  // 모든 SurveyService 데이터 초기화 (테스트용)
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        SURVEY_SHOWN_KEY,
        DIARY_COUNT_KEY,
        'survey_completed'
      ]);
      logger.log('✅ SurveyService data cleared');
    } catch (error) {
      logger.error('Error clearing survey data:', error);
    }
  }
}
