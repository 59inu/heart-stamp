/**
 * Google Analytics 4 (Firebase Analytics) 서비스
 *
 * 리텐션 추적 및 사용자 행동 분석을 위한 이벤트 로깅
 *
 * MOCK 모드:
 * - 개발 모드 (__DEV__ = true): MOCK 사용 (콘솔 로그만)
 * - 프로덕션 빌드 (__DEV__ = false): 실제 Firebase 사용
 *
 * ⚠️ 주의: Firebase Analytics 패키지 설치 전까지는 프로덕션 빌드 금지!
 * 설치 방법: npm install @react-native-firebase/app @react-native-firebase/analytics
 */

import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';
import { UserService } from './userService';
import { DiaryEntry } from '../models/DiaryEntry';
import { logger } from '../utils/logger';
import { ANALYTICS_CONFIG } from '../config/analytics';

// 환경별 자동 조절: 개발 모드에서는 MOCK, 프로덕션에서는 실제 Firebase
const FIREBASE_INSTALLED = false;  // Firebase Analytics 패키지는 설치되었지만 빌드 전까지는 MOCK 사용
const MOCK_MODE = FIREBASE_INSTALLED ? __DEV__ : true;

export class AnalyticsService {
  private static isInitialized = false;

  /**
   * Firebase로 실제 전송할지 여부 확인
   * - 프로덕션 모드: 전송
   * - 개발 모드: forceEnableInDev가 true일 때만 전송
   */
  private static shouldTrack(): boolean {
    return ANALYTICS_CONFIG.enableTracking || ANALYTICS_CONFIG.forceEnableInDev;
  }

  /**
   * Analytics 초기화
   * - 사용자 ID 설정
   * - 기본 사용자 속성 설정
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 사용자 ID 가져오기
      const userId = await UserService.getOrCreateUserId();

      if (!MOCK_MODE && this.shouldTrack()) {
        // 프로덕션 모드: Firebase로 전송
        await analytics().setUserId(userId);
        await analytics().setUserProperty('platform', Platform.OS);
        await analytics().setUserProperty('app_version', '1.0.0');
      }

      this.isInitialized = true;

      if (ANALYTICS_CONFIG.enableLogging) {
        const mode = MOCK_MODE ? '✅ Analytics initialized (MOCK mode - Firebase not installed)' :
                     this.shouldTrack() ? '✅ Analytics initialized' : '✅ Analytics initialized (DEV mode)';
        logger.log(mode, { userId, platform: Platform.OS });
      }
    } catch (error) {
      logger.error('❌ Failed to initialize analytics:', error);
    }
  }

  /**
   * 이벤트 로깅
   * - 개발 모드: 콘솔 로그만 (Firebase 전송 안 함)
   * - 프로덕션 모드: Firebase로 전송
   */
  static async logEvent(eventName: string, params?: { [key: string]: any }): Promise<void> {
    try {
      // 로그 출력 (디버깅용)
      if (ANALYTICS_CONFIG.enableLogging) {
        const prefix = MOCK_MODE ? '📊 [MOCK]' : this.shouldTrack() ? '📊' : '📊 [DEV]';
        logger.log(`${prefix} Analytics Event: ${eventName}`, params);
      }

      // 실제 Firebase 전송 (프로덕션만)
      if (!MOCK_MODE && this.shouldTrack()) {
        await analytics().logEvent(eventName, params);
      }
    } catch (error) {
      logger.error(`❌ Failed to log event ${eventName}:`, error);
    }
  }

  /**
   * 사용자 속성 설정
   * - 개발 모드: 콘솔 로그만 (Firebase 전송 안 함)
   * - 프로덕션 모드: Firebase로 전송
   */
  static async setUserProperty(name: string, value: string): Promise<void> {
    try {
      // 로그 출력 (디버깅용)
      if (ANALYTICS_CONFIG.enableLogging) {
        const prefix = MOCK_MODE ? '📊 [MOCK]' : this.shouldTrack() ? '📊' : '📊 [DEV]';
        logger.log(`${prefix} User Property: ${name} = ${value}`);
      }

      // 실제 Firebase 전송 (프로덕션만)
      if (!MOCK_MODE && this.shouldTrack()) {
        await analytics().setUserProperty(name, value);
      }
    } catch (error) {
      logger.error(`❌ Failed to set user property ${name}:`, error);
    }
  }

  /**
   * 화면 조회 이벤트
   */
  static async logScreenView(screenName: string, screenClass: string): Promise<void> {
    await this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass,
    });
  }

  // ============================================================
  // 리텐션 추적용 핵심 이벤트
  // ============================================================

  /**
   * 앱 첫 실행 (리텐션 코호트 분석의 시작점)
   */
  static async logFirstOpen(): Promise<void> {
    await this.logEvent('first_open', {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });

    // 코호트 분석을 위한 첫 실행일 저장
    const cohort = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await this.setUserProperty('user_cohort', cohort);
    await this.setUserProperty('first_open_date', cohort);
  }

  /**
   * 온보딩 완료 (첫 전환 이벤트)
   */
  static async logOnboardingComplete(timeToCompleteSeconds: number): Promise<void> {
    await this.logEvent('onboarding_complete', {
      time_to_complete_seconds: timeToCompleteSeconds,
    });
  }

  /**
   * 일기 저장 (가장 중요한 리텐션 지표)
   */
  static async logDiarySave(diary: DiaryEntry, isNew: boolean): Promise<void> {
    await this.logEvent('diary_save', {
      is_new: isNew,
      character_count: diary.content.length,
      has_mood: !!diary.mood,
      has_mood_tag: !!diary.moodTag,
      has_weather: !!diary.weather,
      has_image: !!diary.imageUri,
      server_sync_success: diary.syncedWithServer || false,
      is_today: new Date(diary.date).toDateString() === new Date().toDateString(),
    });
  }

  /**
   * AI 코멘트 조회 (핵심 가치 전달 순간)
   */
  static async logAICommentViewed(
    diary: DiaryEntry,
    viewSource: 'notification_tap' | 'diary_list' | 'stamp_collection' | 'other',
    timeSinceNotificationMinutes?: number
  ): Promise<void> {
    const daysSinceWritten = Math.floor(
      (Date.now() - new Date(diary.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    await this.logEvent('ai_comment_viewed', {
      stamp_type: diary.stampType,
      view_source: viewSource,
      days_since_written: daysSinceWritten,
      time_since_notification_minutes: timeSinceNotificationMinutes,
    });
  }

  /**
   * AI 코멘트 알림 수신
   */
  static async logAICommentNotificationReceived(
    entryId: string,
    appState: 'foreground' | 'background'
  ): Promise<void> {
    await this.logEvent('ai_comment_notification_received', {
      entry_id: entryId,
      app_state: appState,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 일기 삭제 (부정적 신호 - 리텐션에 영향)
   */
  static async logDiaryDelete(
    diary: DiaryEntry,
    userConfirmed: boolean
  ): Promise<void> {
    const daysSinceWritten = Math.floor(
      (Date.now() - new Date(diary.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    await this.logEvent('diary_delete', {
      has_ai_comment: !!diary.aiComment,
      character_count: diary.content.length,
      days_since_written: daysSinceWritten,
      user_confirmed: userConfirmed,
    });
  }

  /**
   * 알림 토글 (이탈 위험 신호)
   */
  static async logNotificationToggle(
    notificationType: 'teacher_comment' | 'daily_reminder',
    enabled: boolean,
    previousState: boolean
  ): Promise<void> {
    await this.logEvent('notification_toggle', {
      notification_type: notificationType,
      enabled,
      previous_state: previousState,
    });

    // 알림 비활성화는 이탈 위험 신호
    if (!enabled && previousState) {
      logger.log('⚠️ Churn risk: User disabled notifications');
    }
  }

  /**
   * 푸시 토큰 등록
   */
  static async logPushTokenRegister(
    success: boolean,
    reason?: string,
    retryCount?: number
  ): Promise<void> {
    await this.logEvent('push_token_register', {
      success,
      reason,
      retry_count: retryCount,
    });
  }

  /**
   * 리포트 생성
   */
  static async logReportGenerate(
    period: 'week' | 'month',
    diaryCount: number,
    success: boolean,
    generationTimeMs?: number
  ): Promise<void> {
    await this.logEvent('report_generate', {
      period,
      diary_count: diaryCount,
      success,
      generation_time_ms: generationTimeMs,
    });
  }

  /**
   * 스탬프 컬렉션 열람
   */
  static async logStampCollectionOpen(
    stampCount: number,
    source: 'mood_stats_tap' | 'navigation'
  ): Promise<void> {
    await this.logEvent('stamp_collection_open', {
      stamp_count: stampCount,
      source,
    });
  }

  /**
   * 설문 참여 (프리미엄 전환 신호)
   */
  static async logSurveyParticipate(diaryCount: number): Promise<void> {
    await this.logEvent('survey_participate', {
      diary_count: diaryCount,
    });

    // 설문 참여는 높은 참여도 신호
    logger.log('✅ High engagement: User participated in survey');
  }

  /**
   * 설문 닫기
   */
  static async logSurveyDismiss(diaryCount: number): Promise<void> {
    await this.logEvent('survey_dismiss', {
      diary_count: diaryCount,
    });
  }

  // ============================================================
  // 리텐션 관련 사용자 속성 업데이트
  // ============================================================

  /**
   * 총 작성 일기 수 업데이트
   */
  static async updateTotalDiariesWritten(count: number): Promise<void> {
    await this.setUserProperty('total_diaries_written', count.toString());
  }

  /**
   * 연속 작성 일수 업데이트 (리텐션의 핵심 지표)
   */
  static async updateWriteStreak(currentStreak: number, longestStreak: number): Promise<void> {
    await this.setUserProperty('current_write_streak', currentStreak.toString());
    await this.setUserProperty('longest_write_streak', longestStreak.toString());

    // 3일 연속 작성은 습관 형성의 신호
    if (currentStreak === 3) {
      logger.log('🔥 Milestone: 3-day write streak achieved!');
      await this.logEvent('milestone_3_day_streak', {
        current_streak: currentStreak,
      });
    }

    // 7일 연속 작성은 강력한 리텐션 신호
    if (currentStreak === 7) {
      logger.log('🔥🔥 Milestone: 7-day write streak achieved!');
      await this.logEvent('milestone_7_day_streak', {
        current_streak: currentStreak,
      });
    }
  }

  /**
   * 마지막 활동일 업데이트
   */
  static async updateLastActiveDate(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.setUserProperty('last_active_date', today);
  }

  /**
   * 마지막 일기 작성일로부터 경과 일수 업데이트
   */
  static async updateDaysSinceLastWrite(days: number): Promise<void> {
    await this.setUserProperty('days_since_last_write', days.toString());

    // 7일 이상 미작성은 이탈 위험
    if (days >= 7) {
      logger.log('⚠️ Churn risk: 7+ days since last write');
    }
  }

  /**
   * 알림 설정 상태 업데이트
   */
  static async updateNotificationSettings(
    teacherCommentEnabled: boolean,
    dailyReminderEnabled: boolean
  ): Promise<void> {
    await this.setUserProperty(
      'teacher_comment_notification_enabled',
      teacherCommentEnabled.toString()
    );
    await this.setUserProperty(
      'daily_reminder_enabled',
      dailyReminderEnabled.toString()
    );
  }

  /**
   * 이탈 위험도 업데이트
   */
  static async updateChurnRisk(
    riskScore: 'low' | 'medium' | 'high'
  ): Promise<void> {
    await this.setUserProperty('churn_risk_score', riskScore);

    if (riskScore === 'high') {
      logger.log('🚨 High churn risk detected!');
    }
  }
}
