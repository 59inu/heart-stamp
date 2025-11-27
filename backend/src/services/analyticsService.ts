import { pool } from './database';

/**
 * Analytics Service
 * 어드민 통계 및 인사이트 제공
 */

export class AnalyticsService {
  /**
   * 시간대별/요일별 작성 패턴 분석
   */
  static async getTimePatterns(): Promise<{
    hourly: Array<{ hour: number; count: number; percentage: number }>;
    weekday: Array<{ day: number; dayName: string; count: number; percentage: number }>;
  }> {
    try {
      // 시간대별 작성 패턴 (0-23시, KST 기준)
      const hourlyResult = await pool.query(`
        SELECT
          EXTRACT(HOUR FROM "createdAt"::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') as hour,
          COUNT(*) as count
        FROM diaries
        WHERE "deletedAt" IS NULL
        GROUP BY EXTRACT(HOUR FROM "createdAt"::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')
        ORDER BY hour
      `);

      const totalDiaries = hourlyResult.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

      const hourly = Array.from({ length: 24 }, (_, hour) => {
        const found = hourlyResult.rows.find(row => parseInt(row.hour, 10) === hour);
        const count = found ? parseInt(found.count, 10) : 0;
        return {
          hour,
          count,
          percentage: totalDiaries > 0 ? Math.round((count / totalDiaries) * 100 * 10) / 10 : 0,
        };
      });

      // 요일별 작성 패턴 (0=일요일, 6=토요일, KST 기준)
      const weekdayResult = await pool.query(`
        SELECT
          EXTRACT(DOW FROM "createdAt"::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') as dow,
          COUNT(*) as count
        FROM diaries
        WHERE "deletedAt" IS NULL
        GROUP BY EXTRACT(DOW FROM "createdAt"::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')
        ORDER BY dow
      `);

      const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

      const weekday = Array.from({ length: 7 }, (_, day) => {
        const found = weekdayResult.rows.find(row => parseInt(row.dow, 10) === day);
        const count = found ? parseInt(found.count, 10) : 0;
        return {
          day,
          dayName: dayNames[day],
          count,
          percentage: totalDiaries > 0 ? Math.round((count / totalDiaries) * 100 * 10) / 10 : 0,
        };
      });

      return { hourly, weekday };
    } catch (error) {
      console.error('❌ [AnalyticsService] Failed to get time patterns:', error);
      throw error;
    }
  }

  /**
   * 사용자 세그멘테이션 & 리텐션 분석
   */
  static async getUserCohorts(): Promise<{
    segments: {
      power_users: number;
      active_users: number;
      new_users: number;
      churned_users: number;
    };
    retention: {
      week1: number;
      week2: number;
      week4: number;
      allTime: number;
    };
    cohortAnalysis: Array<{
      cohortWeek: string;
      newUsers: number;
      week1Retention: number;
      week2Retention: number;
      week4Retention: number;
    }>;
  }> {
    try {
      // 1. 사용자 세그멘테이션
      const segmentResult = await pool.query(`
        WITH user_diary_counts AS (
          SELECT
            "userId",
            COUNT(*) as diary_count,
            MAX("createdAt"::timestamp) as last_diary_date
          FROM diaries
          WHERE "deletedAt" IS NULL
          GROUP BY "userId"
        )
        SELECT
          SUM(CASE WHEN diary_count >= 10 THEN 1 ELSE 0 END) as power_users,
          SUM(CASE WHEN diary_count >= 3 AND diary_count < 10 THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN diary_count >= 1 AND diary_count < 3 THEN 1 ELSE 0 END) as new_users,
          SUM(CASE WHEN last_diary_date < (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 1 ELSE 0 END) as churned_users
        FROM user_diary_counts
      `);

      const segments = {
        power_users: parseInt(segmentResult.rows[0].power_users || 0, 10),
        active_users: parseInt(segmentResult.rows[0].active_users || 0, 10),
        new_users: parseInt(segmentResult.rows[0].new_users || 0, 10),
        churned_users: parseInt(segmentResult.rows[0].churned_users || 0, 10),
      };

      // 2. 전체 리텐션 계산
      const retentionResult = await pool.query(`
        WITH user_first_diary AS (
          SELECT
            "userId",
            MIN("createdAt"::timestamp) as first_diary_date
          FROM diaries
          WHERE "deletedAt" IS NULL
          GROUP BY "userId"
        ),
        user_activity AS (
          SELECT
            ufd."userId",
            ufd.first_diary_date,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= ufd.first_diary_date + INTERVAL '7 days'
                AND d."createdAt"::timestamp < ufd.first_diary_date + INTERVAL '14 days'
              THEN d._id
            END) as week1_diaries,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= ufd.first_diary_date + INTERVAL '14 days'
                AND d."createdAt"::timestamp < ufd.first_diary_date + INTERVAL '21 days'
              THEN d._id
            END) as week2_diaries,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= ufd.first_diary_date + INTERVAL '28 days'
                AND d."createdAt"::timestamp < ufd.first_diary_date + INTERVAL '35 days'
              THEN d._id
            END) as week4_diaries,
            MAX(d."createdAt"::timestamp) as last_activity
          FROM user_first_diary ufd
          LEFT JOIN diaries d ON d."userId" = ufd."userId" AND d."deletedAt" IS NULL
          GROUP BY ufd."userId", ufd.first_diary_date
        )
        SELECT
          COUNT(*) as total_users,
          SUM(CASE WHEN week1_diaries > 0 THEN 1 ELSE 0 END) as week1_retained,
          SUM(CASE WHEN week2_diaries > 0 THEN 1 ELSE 0 END) as week2_retained,
          SUM(CASE WHEN week4_diaries > 0 THEN 1 ELSE 0 END) as week4_retained,
          SUM(CASE WHEN last_activity >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 ELSE 0 END) as active_now
        FROM user_activity
        WHERE first_diary_date < CURRENT_TIMESTAMP - INTERVAL '35 days'
      `);

      const totalUsers = parseInt(retentionResult.rows[0]?.total_users || 0, 10);
      const retention = {
        week1: totalUsers > 0 ? Math.round((parseInt(retentionResult.rows[0].week1_retained || 0, 10) / totalUsers) * 100) : 0,
        week2: totalUsers > 0 ? Math.round((parseInt(retentionResult.rows[0].week2_retained || 0, 10) / totalUsers) * 100) : 0,
        week4: totalUsers > 0 ? Math.round((parseInt(retentionResult.rows[0].week4_retained || 0, 10) / totalUsers) * 100) : 0,
        allTime: totalUsers > 0 ? Math.round((parseInt(retentionResult.rows[0].active_now || 0, 10) / totalUsers) * 100) : 0,
      };

      // 3. 코호트 분석 (최근 12주)
      const cohortResult = await pool.query(`
        WITH weekly_cohorts AS (
          SELECT
            "userId",
            DATE_TRUNC('week', MIN("createdAt"::timestamp)) as cohort_week
          FROM diaries
          WHERE "deletedAt" IS NULL
            AND "createdAt"::timestamp >= CURRENT_TIMESTAMP - INTERVAL '12 weeks'
          GROUP BY "userId"
        ),
        cohort_retention AS (
          SELECT
            wc.cohort_week,
            COUNT(DISTINCT wc."userId") as new_users,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= wc.cohort_week + INTERVAL '7 days'
                AND d."createdAt"::timestamp < wc.cohort_week + INTERVAL '14 days'
              THEN d."userId"
            END) as week1_retained,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= wc.cohort_week + INTERVAL '14 days'
                AND d."createdAt"::timestamp < wc.cohort_week + INTERVAL '21 days'
              THEN d."userId"
            END) as week2_retained,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= wc.cohort_week + INTERVAL '28 days'
                AND d."createdAt"::timestamp < wc.cohort_week + INTERVAL '35 days'
              THEN d."userId"
            END) as week4_retained
          FROM weekly_cohorts wc
          LEFT JOIN diaries d ON d."userId" = wc."userId" AND d."deletedAt" IS NULL
          GROUP BY wc.cohort_week
        )
        SELECT
          TO_CHAR(cohort_week, 'YYYY-"W"IW') as cohort_week,
          new_users,
          CASE WHEN new_users > 0 THEN ROUND((week1_retained::numeric / new_users) * 100) ELSE 0 END as week1_retention,
          CASE WHEN new_users > 0 THEN ROUND((week2_retained::numeric / new_users) * 100) ELSE 0 END as week2_retention,
          CASE WHEN new_users > 0 THEN ROUND((week4_retained::numeric / new_users) * 100) ELSE 0 END as week4_retention
        FROM cohort_retention
        ORDER BY cohort_week DESC
      `);

      const cohortAnalysis = cohortResult.rows.map(row => ({
        cohortWeek: row.cohort_week,
        newUsers: parseInt(row.new_users, 10),
        week1Retention: parseFloat(row.week1_retention),
        week2Retention: parseFloat(row.week2_retention),
        week4Retention: parseFloat(row.week4_retention),
      }));

      return {
        segments,
        retention,
        cohortAnalysis,
      };
    } catch (error) {
      console.error('❌ [AnalyticsService] Failed to get user cohorts:', error);
      throw error;
    }
  }

  /**
   * 비용 예측 및 최적화 분석
   */
  static async getCostForecast(): Promise<{
    current: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    forecast: {
      nextWeek: number;
      nextMonth: number;
    };
    breakdown: {
      comments: {
        total: number;
        sonnet: number;
        haiku: number;
      };
      reports: {
        total: number;
        weekly: number;
        monthly: number;
      };
    };
    optimization: {
      potentialSavings: number;
      recommendedThreshold: number;
    };
  }> {
    try {
      // 비용 단가 (USD)
      const COST_PER_SONNET = 0.01;
      const COST_PER_HAIKU = 0.001;
      const COST_PER_WEEKLY_REPORT = 0.015; // Sonnet 사용
      const COST_PER_MONTHLY_REPORT = 0.02; // Sonnet 사용

      // 1. 최근 30일 일별 평균 비용
      const dailyCostResult = await pool.query(`
        SELECT
          COUNT(CASE WHEN model = 'sonnet' THEN 1 END) as sonnet_count,
          COUNT(CASE WHEN model = 'haiku' THEN 1 END) as haiku_count
        FROM diaries
        WHERE "aiComment" IS NOT NULL
          AND "deletedAt" IS NULL
          AND "createdAt"::timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      `);

      const sonnetCount = parseInt(dailyCostResult.rows[0].sonnet_count || 0, 10);
      const haikuCount = parseInt(dailyCostResult.rows[0].haiku_count || 0, 10);
      const totalComments = sonnetCount + haikuCount;

      const dailyAvgCost = ((sonnetCount * COST_PER_SONNET) + (haikuCount * COST_PER_HAIKU)) / 30;

      // 2. 주간/월간 리포트 비용 (전체 누적)
      const reportCostResult = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM reports WHERE period = 'weekly' AND "deletedAt" IS NULL) as weekly_reports,
          (SELECT COUNT(*) FROM reports WHERE period = 'monthly' AND "deletedAt" IS NULL) as monthly_reports
      `);

      const weeklyReports = parseInt(reportCostResult.rows[0]?.weekly_reports || 0, 10);
      const monthlyReports = parseInt(reportCostResult.rows[0]?.monthly_reports || 0, 10);

      const reportCostTotal = (weeklyReports * COST_PER_WEEKLY_REPORT) + (monthlyReports * COST_PER_MONTHLY_REPORT);

      // 3. 현재 비용
      const current = {
        daily: Math.round(dailyAvgCost * 1000) / 1000,
        weekly: Math.round(dailyAvgCost * 7 * 1000) / 1000,
        monthly: Math.round(dailyAvgCost * 30 * 1000) / 1000,
      };

      // 4. 예측 (최근 7일 평균 기준)
      const recentCostResult = await pool.query(`
        SELECT
          COUNT(CASE WHEN model = 'sonnet' THEN 1 END) as sonnet_count,
          COUNT(CASE WHEN model = 'haiku' THEN 1 END) as haiku_count
        FROM diaries
        WHERE "aiComment" IS NOT NULL
          AND "deletedAt" IS NULL
          AND "createdAt"::timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      `);

      const recentSonnet = parseInt(recentCostResult.rows[0].sonnet_count || 0, 10);
      const recentHaiku = parseInt(recentCostResult.rows[0].haiku_count || 0, 10);
      const recentDailyAvg = ((recentSonnet * COST_PER_SONNET) + (recentHaiku * COST_PER_HAIKU)) / 7;

      const forecast = {
        nextWeek: Math.round(recentDailyAvg * 7 * 1000) / 1000,
        nextMonth: Math.round(recentDailyAvg * 30 * 1000) / 1000,
      };

      // 5. 비용 분해
      const breakdown = {
        comments: {
          total: Math.round(((sonnetCount * COST_PER_SONNET) + (haikuCount * COST_PER_HAIKU)) * 1000) / 1000,
          sonnet: Math.round(sonnetCount * COST_PER_SONNET * 1000) / 1000,
          haiku: Math.round(haikuCount * COST_PER_HAIKU * 1000) / 1000,
        },
        reports: {
          total: Math.round(reportCostTotal * 1000) / 1000,
          weekly: Math.round(weeklyReports * COST_PER_WEEKLY_REPORT * 1000) / 1000,
          monthly: Math.round(monthlyReports * COST_PER_MONTHLY_REPORT * 1000) / 1000,
        },
      };

      // 6. 최적화 제안
      // 만약 모든 코멘트를 Haiku로 처리했다면 절감 가능 금액
      const potentialSavings = Math.round((sonnetCount * (COST_PER_SONNET - COST_PER_HAIKU)) * 1000) / 1000;

      // importanceScore 분포 분석 (Sonnet 사용된 일기의 평균 점수)
      const thresholdResult = await pool.query(`
        SELECT
          AVG("importanceScore") as avg_sonnet_score
        FROM diaries
        WHERE model = 'sonnet'
          AND "importanceScore" IS NOT NULL
          AND "deletedAt" IS NULL
      `);

      const avgSonnetScore = parseFloat(thresholdResult.rows[0]?.avg_sonnet_score || 15);
      const recommendedThreshold = Math.round(avgSonnetScore * 0.8); // 평균의 80% 수준

      const optimization = {
        potentialSavings,
        recommendedThreshold,
      };

      return {
        current,
        forecast,
        breakdown,
        optimization,
      };
    } catch (error) {
      console.error('❌ [AnalyticsService] Failed to get cost forecast:', error);
      throw error;
    }
  }

  /**
   * 그림일기 사용 vs 일기 작성량 상관관계 분석
   */
  static async getImageCorrelation(): Promise<{
    basic: {
      withImage: {
        userCount: number;
        avgDiaries: number;
        avgImagesPerUser: number;
      };
      withoutImage: {
        userCount: number;
        avgDiaries: number;
      };
      difference: {
        avgDiariesDiff: number;
        percentage: number;
      };
    };
    bySegment: {
      power_users: { withImage: number; withoutImage: number; imageUsageRate: number };
      active_users: { withImage: number; withoutImage: number; imageUsageRate: number };
      new_users: { withImage: number; withoutImage: number; imageUsageRate: number };
    };
    retention: {
      withImage: { week1: number; week2: number; week4: number };
      withoutImage: { week1: number; week2: number; week4: number };
    };
    firstUsageImpact: {
      before30Days: number;
      after30Days: number;
      increaseRate: number;
    };
    byUsageRate: Array<{
      imageRateRange: string;
      userCount: number;
      avgDiaries: number;
    }>;
    correlation: {
      coefficient: number;
      strength: string;
    };
  }> {
    try {
      // 1. 기본 비교: 그림일기 사용자 vs 비사용자
      const basicResult = await pool.query(`
        WITH user_stats AS (
          SELECT
            "userId",
            COUNT(*) as total_diaries,
            COUNT(CASE WHEN "imageGenerationStatus" = 'completed' THEN 1 END) as image_diaries
          FROM diaries
          WHERE "deletedAt" IS NULL
          GROUP BY "userId"
        )
        SELECT
          COUNT(CASE WHEN image_diaries > 0 THEN 1 END) as users_with_image,
          AVG(CASE WHEN image_diaries > 0 THEN total_diaries END) as avg_with_image,
          AVG(CASE WHEN image_diaries > 0 THEN image_diaries END) as avg_images_per_user,
          COUNT(CASE WHEN image_diaries = 0 THEN 1 END) as users_without_image,
          AVG(CASE WHEN image_diaries = 0 THEN total_diaries END) as avg_without_image
        FROM user_stats
      `);

      const basicRow = basicResult.rows[0];
      const avgWithImage = parseFloat(basicRow.avg_with_image || 0);
      const avgWithoutImage = parseFloat(basicRow.avg_without_image || 0);
      const avgDiff = avgWithImage - avgWithoutImage;
      const percentage = avgWithoutImage > 0 ? ((avgWithImage / avgWithoutImage - 1) * 100) : 0;

      const basic = {
        withImage: {
          userCount: parseInt(basicRow.users_with_image || 0, 10),
          avgDiaries: Math.round(avgWithImage * 10) / 10,
          avgImagesPerUser: Math.round(parseFloat(basicRow.avg_images_per_user || 0) * 10) / 10,
        },
        withoutImage: {
          userCount: parseInt(basicRow.users_without_image || 0, 10),
          avgDiaries: Math.round(avgWithoutImage * 10) / 10,
        },
        difference: {
          avgDiariesDiff: Math.round(avgDiff * 10) / 10,
          percentage: Math.round(percentage * 10) / 10,
        },
      };

      // 2. 세그먼트별 그림일기 사용률
      const segmentResult = await pool.query(`
        WITH user_classification AS (
          SELECT
            "userId",
            COUNT(*) as diary_count,
            COUNT(CASE WHEN "imageGenerationStatus" = 'completed' THEN 1 END) as image_count,
            CASE
              WHEN COUNT(*) >= 10 THEN 'power'
              WHEN COUNT(*) >= 3 THEN 'active'
              ELSE 'new'
            END as segment
          FROM diaries
          WHERE "deletedAt" IS NULL
          GROUP BY "userId"
        )
        SELECT
          segment,
          COUNT(CASE WHEN image_count > 0 THEN 1 END) as with_image,
          COUNT(CASE WHEN image_count = 0 THEN 1 END) as without_image,
          ROUND(COUNT(CASE WHEN image_count > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as usage_rate
        FROM user_classification
        GROUP BY segment
      `);

      const bySegment = {
        power_users: { withImage: 0, withoutImage: 0, imageUsageRate: 0 },
        active_users: { withImage: 0, withoutImage: 0, imageUsageRate: 0 },
        new_users: { withImage: 0, withoutImage: 0, imageUsageRate: 0 },
      };

      for (const row of segmentResult.rows) {
        const key = `${row.segment}_users` as keyof typeof bySegment;
        bySegment[key] = {
          withImage: parseInt(row.with_image, 10),
          withoutImage: parseInt(row.without_image, 10),
          imageUsageRate: parseFloat(row.usage_rate || 0),
        };
      }

      // 3. 리텐션 비교 (그림일기 사용자 vs 비사용자)
      const retentionResult = await pool.query(`
        WITH user_first_diary AS (
          SELECT
            "userId",
            MIN("createdAt"::timestamp) as first_diary_date,
            COUNT(CASE WHEN "imageGenerationStatus" = 'completed' THEN 1 END) > 0 as has_image
          FROM diaries
          WHERE "deletedAt" IS NULL
          GROUP BY "userId"
        ),
        user_retention AS (
          SELECT
            ufd."userId",
            ufd.has_image,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= ufd.first_diary_date + INTERVAL '7 days'
                AND d."createdAt"::timestamp < ufd.first_diary_date + INTERVAL '14 days'
              THEN d._id
            END) > 0 as week1_active,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= ufd.first_diary_date + INTERVAL '14 days'
                AND d."createdAt"::timestamp < ufd.first_diary_date + INTERVAL '21 days'
              THEN d._id
            END) > 0 as week2_active,
            COUNT(DISTINCT CASE
              WHEN d."createdAt"::timestamp >= ufd.first_diary_date + INTERVAL '28 days'
                AND d."createdAt"::timestamp < ufd.first_diary_date + INTERVAL '35 days'
              THEN d._id
            END) > 0 as week4_active
          FROM user_first_diary ufd
          LEFT JOIN diaries d ON d."userId" = ufd."userId" AND d."deletedAt" IS NULL
          WHERE ufd.first_diary_date < CURRENT_TIMESTAMP - INTERVAL '35 days'
          GROUP BY ufd."userId", ufd.has_image
        )
        SELECT
          has_image,
          COUNT(*) as total_users,
          SUM(CASE WHEN week1_active THEN 1 ELSE 0 END) as week1_retained,
          SUM(CASE WHEN week2_active THEN 1 ELSE 0 END) as week2_retained,
          SUM(CASE WHEN week4_active THEN 1 ELSE 0 END) as week4_retained
        FROM user_retention
        GROUP BY has_image
      `);

      const retention = {
        withImage: { week1: 0, week2: 0, week4: 0 },
        withoutImage: { week1: 0, week2: 0, week4: 0 },
      };

      for (const row of retentionResult.rows) {
        const totalUsers = parseInt(row.total_users, 10);
        const key = row.has_image ? 'withImage' : 'withoutImage';
        retention[key] = {
          week1: totalUsers > 0 ? Math.round((parseInt(row.week1_retained, 10) / totalUsers) * 100) : 0,
          week2: totalUsers > 0 ? Math.round((parseInt(row.week2_retained, 10) / totalUsers) * 100) : 0,
          week4: totalUsers > 0 ? Math.round((parseInt(row.week4_retained, 10) / totalUsers) * 100) : 0,
        };
      }

      // 4. 첫 사용 전후 변화
      const firstUsageResult = await pool.query(`
        WITH first_image AS (
          SELECT
            "userId",
            MIN("createdAt"::timestamp) as first_image_date
          FROM diaries
          WHERE "imageGenerationStatus" = 'completed'
            AND "deletedAt" IS NULL
          GROUP BY "userId"
        ),
        before_after AS (
          SELECT
            d."userId",
            COUNT(CASE
              WHEN d."createdAt"::timestamp < fi.first_image_date
                AND d."createdAt"::timestamp >= fi.first_image_date - INTERVAL '30 days'
              THEN 1
            END) as before_count,
            COUNT(CASE
              WHEN d."createdAt"::timestamp >= fi.first_image_date
                AND d."createdAt"::timestamp < fi.first_image_date + INTERVAL '30 days'
              THEN 1
            END) as after_count
          FROM diaries d
          JOIN first_image fi ON d."userId" = fi."userId"
          WHERE d."deletedAt" IS NULL
          GROUP BY d."userId"
        )
        SELECT
          AVG(before_count / 4.0) as avg_per_week_before,
          AVG(after_count / 4.0) as avg_per_week_after
        FROM before_after
        WHERE before_count > 0
      `);

      const firstUsageRow = firstUsageResult.rows[0];
      const before = parseFloat(firstUsageRow?.avg_per_week_before || 0);
      const after = parseFloat(firstUsageRow?.avg_per_week_after || 0);
      const increaseRate = before > 0 ? ((after / before - 1) * 100) : 0;

      const firstUsageImpact = {
        before30Days: Math.round(before * 10) / 10,
        after30Days: Math.round(after * 10) / 10,
        increaseRate: Math.round(increaseRate * 10) / 10,
      };

      // 5. 사용 빈도별 분석
      const usageRateResult = await pool.query(`
        WITH user_stats AS (
          SELECT
            "userId",
            COUNT(*) as total_diaries,
            COUNT(CASE WHEN "imageGenerationStatus" = 'completed' THEN 1 END) as image_diaries
          FROM diaries
          WHERE "deletedAt" IS NULL
          GROUP BY "userId"
        ),
        categorized AS (
          SELECT
            "userId",
            total_diaries,
            CASE
              WHEN image_diaries = 0 THEN '0%'
              WHEN image_diaries::numeric / total_diaries <= 0.25 THEN '1-25%'
              WHEN image_diaries::numeric / total_diaries <= 0.50 THEN '26-50%'
              WHEN image_diaries::numeric / total_diaries <= 0.75 THEN '51-75%'
              ELSE '76-100%'
            END as rate_range
          FROM user_stats
        )
        SELECT
          rate_range,
          COUNT(*) as user_count,
          AVG(total_diaries) as avg_diaries
        FROM categorized
        GROUP BY rate_range
        ORDER BY
          CASE rate_range
            WHEN '0%' THEN 0
            WHEN '1-25%' THEN 1
            WHEN '26-50%' THEN 2
            WHEN '51-75%' THEN 3
            WHEN '76-100%' THEN 4
          END
      `);

      const byUsageRate = usageRateResult.rows.map(row => ({
        imageRateRange: row.rate_range,
        userCount: parseInt(row.user_count, 10),
        avgDiaries: Math.round(parseFloat(row.avg_diaries) * 10) / 10,
      }));

      // 6. 피어슨 상관계수 계산
      const correlationResult = await pool.query(`
        WITH user_stats AS (
          SELECT
            COUNT(*) as total_diaries,
            COUNT(CASE WHEN "imageGenerationStatus" = 'completed' THEN 1 END) as image_diaries
          FROM diaries
          WHERE "deletedAt" IS NULL
          GROUP BY "userId"
        )
        SELECT
          CORR(total_diaries, image_diaries) as correlation_coefficient
        FROM user_stats
      `);

      const coefficient = parseFloat(correlationResult.rows[0]?.correlation_coefficient || 0);
      const absCoeff = Math.abs(coefficient);
      const strength = absCoeff >= 0.7 ? 'strong' : absCoeff >= 0.4 ? 'moderate' : 'weak';

      const correlation = {
        coefficient: Math.round(coefficient * 100) / 100,
        strength,
      };

      return {
        basic,
        bySegment,
        retention,
        firstUsageImpact,
        byUsageRate,
        correlation,
      };
    } catch (error) {
      console.error('❌ [AnalyticsService] Failed to get image correlation:', error);
      throw error;
    }
  }

  /**
   * 어제 vs 오늘 일일 현황 스냅샷
   */
  static async getDailySnapshot(): Promise<{
    today: any;
    yesterday: any;
    comparison: any;
    hourlyTrend: any;
    alerts: any;
  }> {
    try {
      // KST 기준 오늘/어제 날짜 계산
      const now = new Date();
      const kstOffset = 9 * 60; // +9시간
      const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);

      const todayStr = kstNow.toISOString().split('T')[0]; // YYYY-MM-DD

      const yesterday = new Date(kstNow);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 오늘/어제 데이터 조회 함수
      const getDayData = async (dateStr: string) => {
        // 일기 통계
        const diaryResult = await pool.query(`
          WITH day_diaries AS (
            SELECT
              _id,
              "userId",
              "imageGenerationStatus",
              LENGTH(content) as content_length
            FROM diaries
            WHERE date LIKE $1
              AND "deletedAt" IS NULL
          )
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN "imageGenerationStatus" = 'completed' THEN 1 END) as with_image,
            AVG(content_length) as avg_length,
            COUNT(DISTINCT "userId") as active_users
          FROM day_diaries
        `, [`${dateStr}%`]);

        const diaryRow = diaryResult.rows[0];

        // 신규 vs 재방문 사용자
        const userTypeResult = await pool.query(`
          WITH day_users AS (
            SELECT DISTINCT "userId"
            FROM diaries
            WHERE date LIKE $1 AND "deletedAt" IS NULL
          ),
          first_diary_dates AS (
            SELECT
              "userId",
              MIN(date) as first_date
            FROM diaries
            WHERE "deletedAt" IS NULL
            GROUP BY "userId"
          )
          SELECT
            COUNT(CASE WHEN fdd.first_date LIKE $1 THEN 1 END) as new_users,
            COUNT(CASE WHEN fdd.first_date NOT LIKE $1 THEN 1 END) as returning_users
          FROM day_users du
          JOIN first_diary_dates fdd ON du."userId" = fdd."userId"
        `, [`${dateStr}%`]);

        const userTypeRow = userTypeResult.rows[0];

        // AI 코멘트 통계
        const aiCommentResult = await pool.query(`
          SELECT
            COUNT(CASE WHEN "aiComment" IS NOT NULL THEN 1 END) as total,
            COUNT(CASE WHEN model = 'sonnet' THEN 1 END) as sonnet,
            COUNT(CASE WHEN model = 'haiku' THEN 1 END) as haiku,
            COUNT(CASE WHEN "aiComment" IS NOT NULL AND model IS NULL THEN 1 END) as fallback,
            COUNT(CASE WHEN "aiComment" IS NULL THEN 1 END) as pending,
            AVG(CASE WHEN "importanceScore" IS NOT NULL THEN "importanceScore" END) as avg_score
          FROM diaries
          WHERE date LIKE $1 AND "deletedAt" IS NULL
        `, [`${dateStr}%`]);

        const aiRow = aiCommentResult.rows[0];

        // 이미지 생성 통계
        const imageResult = await pool.query(`
          SELECT
            COUNT(CASE WHEN "imageGenerationStatus" = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN "imageGenerationStatus" = 'failed' THEN 1 END) as failed,
            COUNT(CASE WHEN "imageGenerationStatus" = 'pending' OR "imageGenerationStatus" = 'generating' THEN 1 END) as pending
          FROM diaries
          WHERE date LIKE $1 AND "deletedAt" IS NULL
        `, [`${dateStr}%`]);

        const imageRow = imageResult.rows[0];

        // 비용 계산
        const COST_PER_SONNET = 0.01;
        const COST_PER_HAIKU = 0.001;
        const sonnetCount = parseInt(aiRow.sonnet || 0, 10);
        const haikuCount = parseInt(aiRow.haiku || 0, 10);
        const totalCost = (sonnetCount * COST_PER_SONNET) + (haikuCount * COST_PER_HAIKU);

        return {
          date: dateStr,
          diaries: {
            total: parseInt(diaryRow.total || 0, 10),
            withImage: parseInt(diaryRow.with_image || 0, 10),
            avgLength: Math.round(parseFloat(diaryRow.avg_length || 0)),
            activeUsers: parseInt(diaryRow.active_users || 0, 10),
            newUsers: parseInt(userTypeRow.new_users || 0, 10),
            returningUsers: parseInt(userTypeRow.returning_users || 0, 10),
          },
          aiComments: {
            total: parseInt(aiRow.total || 0, 10),
            sonnet: parseInt(aiRow.sonnet || 0, 10),
            haiku: parseInt(aiRow.haiku || 0, 10),
            fallback: parseInt(aiRow.fallback || 0, 10),
            pending: parseInt(aiRow.pending || 0, 10),
            avgImportanceScore: aiRow.avg_score ? Math.round(parseFloat(aiRow.avg_score) * 10) / 10 : null,
          },
          images: {
            completed: parseInt(imageRow.completed || 0, 10),
            failed: parseInt(imageRow.failed || 0, 10),
            pending: parseInt(imageRow.pending || 0, 10),
          },
          cost: {
            total: Math.round(totalCost * 1000) / 1000,
            sonnet: Math.round(sonnetCount * COST_PER_SONNET * 1000) / 1000,
            haiku: Math.round(haikuCount * COST_PER_HAIKU * 1000) / 1000,
          },
        };
      };

      // 오늘/어제 데이터 조회
      const [today, yesterday] = await Promise.all([
        getDayData(todayStr),
        getDayData(yesterdayStr),
      ]);

      // 비교 계산
      const calcComparison = (todayVal: number, yesterdayVal: number) => {
        const diff = todayVal - yesterdayVal;
        const percentage = yesterdayVal > 0
          ? Math.round((diff / yesterdayVal) * 100 * 10) / 10
          : (todayVal > 0 ? 100 : 0);
        return { diff, percentage };
      };

      const comparison = {
        diaries: calcComparison(today.diaries.total, yesterday.diaries.total),
        activeUsers: calcComparison(today.diaries.activeUsers, yesterday.diaries.activeUsers),
        aiComments: calcComparison(today.aiComments.total, yesterday.aiComments.total),
        images: calcComparison(today.images.completed, yesterday.images.completed),
      };

      // 시간대별 트렌드 (KST 기준)
      const hourlyTrendResult = await pool.query(`
        SELECT
          date,
          EXTRACT(HOUR FROM "createdAt"::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') as hour,
          COUNT(*) as count
        FROM diaries
        WHERE (date LIKE $1 OR date LIKE $2)
          AND "deletedAt" IS NULL
        GROUP BY date, EXTRACT(HOUR FROM "createdAt"::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')
        ORDER BY date, hour
      `, [`${todayStr}%`, `${yesterdayStr}%`]);

      const todayHourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
      const yesterdayHourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));

      for (const row of hourlyTrendResult.rows) {
        const hour = parseInt(row.hour, 10);
        const count = parseInt(row.count, 10);
        if (row.date.startsWith(todayStr)) {
          todayHourly[hour].count = count;
        } else {
          yesterdayHourly[hour].count = count;
        }
      }

      const hourlyTrend = {
        today: todayHourly,
        yesterday: yesterdayHourly,
      };

      // 알림 (Alerts)
      const alerts: {
        warnings: Array<{ type: string; count: number; message: string }>;
        errors: Array<{ type: string; count: number; message: string }>;
        info: Array<{ type: string; time?: string; message: string }>;
      } = {
        warnings: [],
        errors: [],
        info: [],
      };

      // 경고: AI 코멘트 대기 중 (어제 일기)
      if (yesterday.aiComments.pending > 0) {
        alerts.warnings.push({
          type: 'pending_comments',
          count: yesterday.aiComments.pending,
          message: `어제 일기 중 AI 코멘트 대기: ${yesterday.aiComments.pending}개`,
        });
      }

      // 경고: 이미지 생성 실패
      const totalImageFailed = today.images.failed + yesterday.images.failed;
      if (totalImageFailed > 0) {
        alerts.warnings.push({
          type: 'image_failed',
          count: totalImageFailed,
          message: `이미지 생성 실패: ${totalImageFailed}건 (오늘: ${today.images.failed}, 어제: ${yesterday.images.failed})`,
        });
      }

      // 에러: Fallback 발생
      const totalFallback = today.aiComments.fallback + yesterday.aiComments.fallback;
      if (totalFallback > 0) {
        alerts.errors.push({
          type: 'fallback_occurred',
          count: totalFallback,
          message: `Fallback 코멘트 발생: ${totalFallback}건 (오늘: ${today.aiComments.fallback}, 어제: ${yesterday.aiComments.fallback})`,
        });
      }

      // 정보: 배치 작업 완료 (어제 일기에 코멘트가 생성되었다면)
      if (yesterday.aiComments.total > 0) {
        alerts.info.push({
          type: 'batch_completed',
          time: '03:00',
          message: `배치 작업 완료: 어제 일기 ${yesterday.aiComments.total}개에 AI 코멘트 생성`,
        });
      }

      return {
        today,
        yesterday,
        comparison,
        hourlyTrend,
        alerts,
      };
    } catch (error) {
      console.error('❌ [AnalyticsService] Failed to get daily snapshot:', error);
      throw error;
    }
  }
}
