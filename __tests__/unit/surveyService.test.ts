/**
 * SurveyService 테스트
 *
 * 목적: 설문조사 및 일기 카운트 관리 로직 검증
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SurveyService } from '../../src/services/surveyService';

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('SurveyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasShownSurvey', () => {
    it('should return true when survey was shown', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const result = await SurveyService.hasShownSurvey();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('survey_modal_shown');
    });

    it('should return false when survey was not shown', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await SurveyService.hasShownSurvey();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await SurveyService.hasShownSurvey();

      expect(result).toBe(false);
    });
  });

  describe('markSurveyShown', () => {
    it('should mark survey as shown', async () => {
      await SurveyService.markSurveyShown();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('survey_modal_shown', 'true');
    });
  });

  describe('getDiaryWriteCount', () => {
    it('should return 0 when no count is stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const count = await SurveyService.getDiaryWriteCount();

      expect(count).toBe(0);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('diary_write_count');
    });

    it('should return stored count', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('5');

      const count = await SurveyService.getDiaryWriteCount();

      expect(count).toBe(5);
    });

    it('should handle errors and return 0', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const count = await SurveyService.getDiaryWriteCount();

      expect(count).toBe(0);
    });

    it('should parse integer correctly', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('42');

      const count = await SurveyService.getDiaryWriteCount();

      expect(count).toBe(42);
    });
  });

  describe('incrementDiaryCount', () => {
    it('should increment from 0 to 1', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const newCount = await SurveyService.incrementDiaryCount();

      expect(newCount).toBe(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('diary_write_count', '1');
    });

    it('should increment existing count', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('5');

      const newCount = await SurveyService.incrementDiaryCount();

      expect(newCount).toBe(6);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('diary_write_count', '6');
    });

    it('should handle errors in getItem and still increment from 0', async () => {
      // getDiaryWriteCount catches error and returns 0
      // incrementDiaryCount then increments from 0 to 1
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const newCount = await SurveyService.incrementDiaryCount();

      // getDiaryWriteCount returns 0 on error, then we increment to 1
      expect(newCount).toBe(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('diary_write_count', '1');
    });
  });

  describe('hasCompletedSurvey', () => {
    it('should return true when survey is completed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const result = await SurveyService.hasCompletedSurvey();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('survey_completed');
    });

    it('should return false when survey is not completed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await SurveyService.hasCompletedSurvey();

      expect(result).toBe(false);
    });
  });

  describe('markSurveyCompleted', () => {
    it('should mark survey as completed', async () => {
      await SurveyService.markSurveyCompleted();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('survey_completed', 'true');
    });
  });

  describe('syncDiaryCount', () => {
    it('should sync count when current is less than actual', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('5');

      await SurveyService.syncDiaryCount(10);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('diary_write_count', '10');
    });

    it('should NOT sync when current is equal to actual', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('10');

      await SurveyService.syncDiaryCount(10);

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should NOT sync when current is greater than actual', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('15');

      await SurveyService.syncDiaryCount(10);

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(SurveyService.syncDiaryCount(10)).resolves.toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle diary writing flow', async () => {
      // 1. Initial count is 0
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      let count = await SurveyService.getDiaryWriteCount();
      expect(count).toBe(0);

      // 2. Write first diary
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('0');
      count = await SurveyService.incrementDiaryCount();
      expect(count).toBe(1);

      // 3. Write second diary
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');
      count = await SurveyService.incrementDiaryCount();
      expect(count).toBe(2);

      // 4. Write third diary
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('2');
      count = await SurveyService.incrementDiaryCount();
      expect(count).toBe(3);
    });

    it('should handle survey modal flow', async () => {
      // 1. Check if survey was shown (not shown yet)
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      let shown = await SurveyService.hasShownSurvey();
      expect(shown).toBe(false);

      // 2. Mark survey as shown
      await SurveyService.markSurveyShown();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('survey_modal_shown', 'true');

      // 3. Check if survey was shown (now it is)
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      shown = await SurveyService.hasShownSurvey();
      expect(shown).toBe(true);

      // 4. Mark survey as completed
      await SurveyService.markSurveyCompleted();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('survey_completed', 'true');

      // 5. Check if survey is completed
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      const completed = await SurveyService.hasCompletedSurvey();
      expect(completed).toBe(true);
    });
  });
});
