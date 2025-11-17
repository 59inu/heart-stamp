import { Router, Request, Response } from 'express';
import { ReportService } from '../services/reportService';
import { startOfISOWeek, endOfISOWeek, setISOWeek, setYear, startOfDay, isAfter, startOfMonth, endOfMonth } from 'date-fns';

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
      return res.status(401).json({
        success: false,
        message: 'User ID is required',
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

    // 주의 시작일과 종료일 계산 (ISO 8601) - date-fns 사용 (TZ 환경변수 기준)
    const referenceDate = setISOWeek(setYear(new Date(), year), week);
    const startDate = startOfISOWeek(referenceDate);
    const endDate = endOfISOWeek(referenceDate);

    console.log(`\n[DEBUG GET] Week ${year}-W${week} calculation:`);
    console.log(`  TZ: ${process.env.TZ || 'not set (using UTC)'}`);
    console.log(`  startDate: ${startDate.toISOString()}`);
    console.log(`  endDate: ${endDate.toISOString()}`);

    // 현재 날짜와 비교 (로컬 시간 기준, 날짜만 비교)
    const today = startOfDay(new Date());
    const periodEnd = startOfDay(endDate);

    if (!isAfter(today, periodEnd)) {
      return res.status(400).json({
        success: false,
        message: 'Week not completed yet',
      });
    }

    // 일기 개수 확인
    const { DiaryDatabase } = await import('../services/database');
    const allDiaries = DiaryDatabase.getAllByUserId(userId);

    console.log(`  Total diaries for GET: ${allDiaries.length}`);

    const periodDiaries = allDiaries.filter((diary) => {
      const diaryDate = new Date(diary.date);
      const matches = diaryDate >= startDate && diaryDate <= endDate;

      // 일기가 10개 이하면 모두 출력, 아니면 이번 주 일기만
      if (allDiaries.length <= 10 || matches) {
        console.log(`  GET Diary: ${diary.date} → ${diaryDate.toISOString()} → ${matches ? 'MATCH' : 'NO MATCH'}`);
      }

      return matches;
    });

    console.log(`  GET Period diaries: ${periodDiaries.length}\n`);

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
      return res.status(401).json({
        success: false,
        message: 'User ID is required',
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

    // 주의 시작일과 종료일 계산 (ISO 8601) - date-fns 사용 (TZ 환경변수 기준)
    const referenceDate = setISOWeek(setYear(new Date(), year), week);
    const startDate = startOfISOWeek(referenceDate);
    const endDate = endOfISOWeek(referenceDate);

    console.log(`\n[DEBUG POST] Week ${year}-W${week} calculation:`);
    console.log(`  TZ: ${process.env.TZ || 'not set (using UTC)'}`);
    console.log(`  startDate: ${startDate.toISOString()}`);
    console.log(`  endDate: ${endDate.toISOString()}`);

    // 현재 날짜와 비교 (로컬 시간 기준, 날짜만 비교)
    const today = startOfDay(new Date());
    const periodEnd = startOfDay(endDate);

    if (!isAfter(today, periodEnd)) {
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
      return res.status(401).json({
        success: false,
        message: 'User ID is required',
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

    // 월의 시작일과 종료일 계산 (TZ 환경변수 기준)
    const referenceDate = new Date(year, month - 1, 1);
    const startDate = startOfMonth(referenceDate);
    const endDate = endOfMonth(referenceDate);

    // 현재 날짜와 비교 (로컬 시간 기준, 날짜만 비교)
    const today = startOfDay(new Date());
    const periodEnd = startOfDay(endDate);

    if (!isAfter(today, periodEnd)) {
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
      return res.status(401).json({
        success: false,
        message: 'User ID is required',
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
      return res.status(401).json({
        success: false,
        message: 'User ID is required',
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
