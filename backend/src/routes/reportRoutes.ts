import { Router, Request, Response } from 'express';
import { ReportService } from '../services/reportService';

const router = Router();

// ReportService 인스턴스
let reportService: ReportService;

export function initializeReportService(apiKey?: string) {
  reportService = new ReportService(apiKey);
}

// 주간 리포트 조회 (조회만, 생성 안 함)
router.get('/reports/weekly/:year/:week', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
      });
    }

    const year = parseInt(req.params.year);
    const week = parseInt(req.params.week);

    if (isNaN(year) || isNaN(week)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or week',
      });
    }

    // 주의 시작일과 종료일 계산 (ISO 8601) - UTC 기준
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = (jan4.getUTCDay() + 6) % 7; // 월요일=0
    const firstMonday = new Date(jan4);
    firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day);

    const targetMonday = new Date(firstMonday);
    targetMonday.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);

    const startDate = targetMonday;
    const endDate = new Date(targetMonday);
    endDate.setUTCDate(targetMonday.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999); // 해당 일의 끝까지 포함

    // 현재 날짜와 비교 (UTC 기준 날짜만 비교)
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endDateUTC = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    if (nowUTC <= endDateUTC) {
      return res.status(400).json({
        success: false,
        message: 'Week not completed yet',
      });
    }

    // 일기 개수 확인
    const { DiaryDatabase } = await import('../services/database');
    const allDiaries = DiaryDatabase.getAllByUserId(userId);
    const periodDiaries = allDiaries.filter((diary) => {
      const diaryDate = new Date(diary.date);
      return diaryDate >= startDate && diaryDate <= endDate;
    });

    // 기존 리포트 조회만
    const { ReportDatabase } = await import('../services/reportDatabase');
    const existingReport = ReportDatabase.getWeeklyReport(userId, year, week);

    if (existingReport) {
      return res.json({
        success: true,
        data: existingReport,
      });
    }

    // 리포트가 없으면 생성 가능 여부 정보 반환
    return res.json({
      success: false,
      message: 'Report not found',
      canGenerate: periodDiaries.length >= 3,
      diaryCount: periodDiaries.length,
    });
  } catch (error) {
    console.error('Error getting weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get weekly report',
    });
  }
});

// 주간 리포트 생성
router.post('/reports/weekly/:year/:week', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
      });
    }

    const year = parseInt(req.params.year);
    const week = parseInt(req.params.week);

    if (isNaN(year) || isNaN(week)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or week',
      });
    }

    // 주의 시작일과 종료일 계산 (ISO 8601) - UTC 기준
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = (jan4.getUTCDay() + 6) % 7;
    const firstMonday = new Date(jan4);
    firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day);

    const targetMonday = new Date(firstMonday);
    targetMonday.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);

    const startDate = targetMonday;
    const endDate = new Date(targetMonday);
    endDate.setUTCDate(targetMonday.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999); // 해당 일의 끝까지 포함

    // 현재 날짜와 비교 (UTC 기준 날짜만 비교)
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endDateUTC = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    if (nowUTC <= endDateUTC) {
      return res.status(400).json({
        success: false,
        message: 'Week not completed yet',
      });
    }

    if (!reportService) {
      return res.status(500).json({
        success: false,
        message: 'Report service not initialized',
      });
    }

    const report = await reportService.getOrCreateWeeklyReport(
      userId,
      year,
      week,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error creating weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create weekly report',
    });
  }
});

// 월간 리포트 조회/생성
router.get('/reports/monthly/:year/:month', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
      });
    }

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month',
      });
    }

    // 월의 시작일과 종료일 계산 (UTC 기준)
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month - 1, 1));
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    endDate.setUTCDate(0); // 전월 마지막 날
    endDate.setUTCHours(23, 59, 59, 999);

    // 현재 날짜와 비교 (UTC 기준 날짜만 비교)
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endDateUTC = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    if (nowUTC <= endDateUTC) {
      return res.status(400).json({
        success: false,
        message: 'Month not completed yet',
      });
    }

    if (!reportService) {
      return res.status(500).json({
        success: false,
        message: 'Report service not initialized',
      });
    }

    const report = await reportService.getOrCreateMonthlyReport(
      userId,
      year,
      month,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error getting monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly report',
    });
  }
});

// 리포트 삭제 (재생성용)
router.delete('/reports/weekly/:year/:week', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
      });
    }

    const year = parseInt(req.params.year);
    const week = parseInt(req.params.week);

    if (isNaN(year) || isNaN(week)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or week',
      });
    }

    const { ReportDatabase } = await import('../services/reportDatabase');
    const existingReport = ReportDatabase.getWeeklyReport(userId, year, week);

    if (existingReport) {
      ReportDatabase.delete(existingReport._id);
    }

    res.json({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    console.error('Error deleting weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete weekly report',
    });
  }
});

router.delete('/reports/monthly/:year/:month', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
      });
    }

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month',
      });
    }

    const { ReportDatabase } = await import('../services/reportDatabase');
    const existingReport = ReportDatabase.getMonthlyReport(userId, year, month);

    if (existingReport) {
      ReportDatabase.delete(existingReport._id);
    }

    res.json({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    console.error('Error deleting monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete monthly report',
    });
  }
});

export default router;
