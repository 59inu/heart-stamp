/**
 * OnboardingService 테스트
 *
 * 목적: 온보딩 완료 상태 관리 로직 검증
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingService } from '../../src/services/onboardingService';

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('OnboardingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasCompletedOnboarding', () => {
    it('should return true when onboarding is completed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const result = await OnboardingService.hasCompletedOnboarding();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@onboarding_completed');
    });

    it('should return false when onboarding is not completed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await OnboardingService.hasCompletedOnboarding();

      expect(result).toBe(false);
    });

    it('should return false when AsyncStorage throws error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await OnboardingService.hasCompletedOnboarding();

      expect(result).toBe(false);
    });

    it('should return false for invalid stored value', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

      const result = await OnboardingService.hasCompletedOnboarding();

      expect(result).toBe(false);
    });
  });

  describe('markOnboardingCompleted', () => {
    it('should set onboarding as completed', async () => {
      await OnboardingService.markOnboardingCompleted();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@onboarding_completed', 'true');
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(OnboardingService.markOnboardingCompleted()).resolves.toBeUndefined();
    });
  });

  describe('resetOnboarding', () => {
    it('should remove onboarding status', async () => {
      await OnboardingService.resetOnboarding();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@onboarding_completed');
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(OnboardingService.resetOnboarding()).resolves.toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete onboarding flow', async () => {
      // 1. Initially not completed
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      let isCompleted = await OnboardingService.hasCompletedOnboarding();
      expect(isCompleted).toBe(false);

      // 2. Mark as completed
      await OnboardingService.markOnboardingCompleted();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@onboarding_completed', 'true');

      // 3. Check completed status
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      isCompleted = await OnboardingService.hasCompletedOnboarding();
      expect(isCompleted).toBe(true);

      // 4. Reset
      await OnboardingService.resetOnboarding();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@onboarding_completed');
    });
  });
});
