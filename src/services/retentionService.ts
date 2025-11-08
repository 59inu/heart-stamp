/**
 * 리텐션 추적 서비스
 *
 * 연속 작성 일수, 이탈 위험도 계산 등 리텐션 관련 지표를 계산하고 Analytics에 전달
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry } from '../models/DiaryEntry';
import { DiaryStorage } from './diaryStorage';
import { AnalyticsService } from './analyticsService';
import { logger } from '../utils/logger';

const RETENTION_DATA_KEY = '@stamp_diary:retention_data';

interface RetentionData {
  firstOpenDate: string; // YYYY-MM-DD
  currentWriteStreak: number;
  longestWriteStreak: number;
  lastWriteDate: string; // YYYY-MM-DD
  totalDiariesWritten: number;
}

export class RetentionService {
  /**
   * 리텐션 데이터 불러오기
   */
  private static async getRetentionData(): Promise<RetentionData | null> {
    try {
      const data = await AsyncStorage.getItem(RETENTION_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get retention data:', error);
      return null;
    }
  }

  /**
   * 리텐션 데이터 저장
   */
  private static async saveRetentionData(data: RetentionData): Promise<void> {
    try {
      await AsyncStorage.setItem(RETENTION_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save retention data:', error);
    }
  }

  /**
   * 첫 앱 실행 여부 확인 및 기록
   */
  static async checkAndLogFirstOpen(): Promise<boolean> {
    const data = await this.getRetentionData();

    if (!data) {
      // 첫 실행
      const today = new Date().toISOString().split('T')[0];
      await this.saveRetentionData({
        firstOpenDate: today,
        currentWriteStreak: 0,
        longestWriteStreak: 0,
        lastWriteDate: '',
        totalDiariesWritten: 0,
      });

      await AnalyticsService.logFirstOpen();
      logger.log('🎉 First app open detected!');
      return true;
    }

    return false;
  }

  /**
   * 연속 작성 일수 계산
   */
  static async calculateWriteStreak(diaries: DiaryEntry[]): Promise<{
    currentStreak: number;
    longestStreak: number;
  }> {
    if (diaries.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // 날짜별로 정렬 (최신순)
    const sortedDiaries = [...diaries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 날짜만 추출 (YYYY-MM-DD)
    const uniqueDates = Array.from(
      new Set(
        sortedDiaries.map(d => new Date(d.date).toISOString().split('T')[0])
      )
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // 현재 연속 작성 일수 계산
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 오늘이나 어제 작성했으면 streak 시작
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      currentStreak = 1;

      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // 최장 연속 작성 일수 계산
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  }

  /**
   * 마지막 작성일로부터 경과 일수
   */
  static getDaysSinceLastWrite(diaries: DiaryEntry[]): number {
    if (diaries.length === 0) {
      return -1;
    }

    const sortedDiaries = [...diaries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const lastWriteDate = new Date(sortedDiaries[0].date);
    const today = new Date();
    const diffDays = Math.floor(
      (today.getTime() - lastWriteDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return diffDays;
  }

  /**
   * 이탈 위험도 계산
   *
   * low: 활발한 사용자
   * medium: 관심 감소 중
   * high: 이탈 위험 높음
   */
  static calculateChurnRisk(
    daysSinceLastWrite: number,
    currentStreak: number,
    totalDiaries: number,
    notificationsEnabled: boolean
  ): 'low' | 'medium' | 'high' {
    // 알림을 껐으면 이탈 위험 높음
    if (!notificationsEnabled) {
      return 'high';
    }

    // 7일 이상 미작성
    if (daysSinceLastWrite >= 7) {
      return 'high';
    }

    // 3일 이상 미작성, 연속 작성 0일
    if (daysSinceLastWrite >= 3 && currentStreak === 0) {
      return 'medium';
    }

    // 총 일기가 3개 미만 (온보딩 단계)
    if (totalDiaries < 3) {
      return 'medium';
    }

    // 활발한 사용자
    return 'low';
  }

  /**
   * 일기 저장 후 리텐션 지표 업데이트
   */
  static async updateAfterDiarySave(): Promise<void> {
    try {
      const diaries = await DiaryStorage.getAll();
      const { currentStreak, longestStreak } = await this.calculateWriteStreak(diaries);
      const daysSinceLastWrite = this.getDaysSinceLastWrite(diaries);
      const today = new Date().toISOString().split('T')[0];

      // 리텐션 데이터 업데이트
      const data = await this.getRetentionData();
      if (data) {
        const updatedData: RetentionData = {
          ...data,
          currentWriteStreak: currentStreak,
          longestWriteStreak: Math.max(longestStreak, data.longestWriteStreak),
          lastWriteDate: today,
          totalDiariesWritten: diaries.length,
        };
        await this.saveRetentionData(updatedData);
      }

      // Analytics에 업데이트
      await AnalyticsService.updateTotalDiariesWritten(diaries.length);
      await AnalyticsService.updateWriteStreak(currentStreak, longestStreak);
      await AnalyticsService.updateDaysSinceLastWrite(daysSinceLastWrite);
      await AnalyticsService.updateLastActiveDate();

      logger.log('📊 Retention metrics updated:', {
        totalDiaries: diaries.length,
        currentStreak,
        longestStreak,
        daysSinceLastWrite,
      });
    } catch (error) {
      logger.error('Failed to update retention metrics:', error);
    }
  }

  /**
   * 앱 포그라운드 진입 시 리텐션 지표 업데이트
   */
  static async updateOnAppForeground(): Promise<void> {
    try {
      const diaries = await DiaryStorage.getAll();
      const daysSinceLastWrite = this.getDaysSinceLastWrite(diaries);
      const { currentStreak } = await this.calculateWriteStreak(diaries);

      // 이탈 위험도 계산 (알림 설정은 별도로 가져와야 함)
      const churnRisk = this.calculateChurnRisk(
        daysSinceLastWrite,
        currentStreak,
        diaries.length,
        true // 기본값, 실제로는 NotificationService에서 가져와야 함
      );

      await AnalyticsService.updateDaysSinceLastWrite(daysSinceLastWrite);
      await AnalyticsService.updateChurnRisk(churnRisk);
      await AnalyticsService.updateLastActiveDate();

      logger.log('📊 Retention check on app foreground:', {
        daysSinceLastWrite,
        currentStreak,
        churnRisk,
      });
    } catch (error) {
      logger.error('Failed to update retention on foreground:', error);
    }
  }

  /**
   * 리텐션 리포트 생성 (디버깅용)
   */
  static async getRetentionReport(): Promise<{
    firstOpenDate: string;
    daysActive: number;
    totalDiaries: number;
    currentStreak: number;
    longestStreak: number;
    daysSinceLastWrite: number;
    churnRisk: 'low' | 'medium' | 'high';
  }> {
    const data = await this.getRetentionData();
    const diaries = await DiaryStorage.getAll();
    const { currentStreak, longestStreak } = await this.calculateWriteStreak(diaries);
    const daysSinceLastWrite = this.getDaysSinceLastWrite(diaries);
    const churnRisk = this.calculateChurnRisk(daysSinceLastWrite, currentStreak, diaries.length, true);

    const firstOpenDate = data?.firstOpenDate || new Date().toISOString().split('T')[0];
    const daysActive = Math.floor(
      (Date.now() - new Date(firstOpenDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      firstOpenDate,
      daysActive,
      totalDiaries: diaries.length,
      currentStreak,
      longestStreak,
      daysSinceLastWrite,
      churnRisk,
    };
  }
}
