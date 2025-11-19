import express, { Request, Response } from 'express';
import { DiaryDatabase } from '../services/database';

const router = express.Router();

const MONTHLY_LIMIT = 5;

/**
 * 월별 그림일기 크레딧 조회
 * GET /api/image-generation/credit
 */
router.get('/image-generation/credit', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // 현재 월의 시작과 끝 계산 (UTC 기준)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    // 다음 달 1일 (리셋 날짜)
    const resetDate = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

    console.log(`🎨 [Credit] Checking credit for user ${userId}`);
    console.log(`📅 [Credit] Month range: ${monthStart.toISOString()} ~ ${monthEnd.toISOString()}`);

    // 이번 달에 생성 완료된 그림일기 개수 조회
    const diaries = await DiaryDatabase.getAllByUserId(userId);
    const usedCount = diaries.filter((diary: any) => {
      const diaryDate = new Date(diary.createdAt);
      return (
        diary.imageGenerationStatus === 'completed' &&
        diaryDate >= monthStart &&
        diaryDate <= monthEnd
      );
    }).length;

    const remaining = Math.max(0, MONTHLY_LIMIT - usedCount);

    console.log(`✅ [Credit] Used: ${usedCount}/${MONTHLY_LIMIT}, Remaining: ${remaining}`);

    res.json({
      success: true,
      data: {
        used: usedCount,
        limit: MONTHLY_LIMIT,
        remaining,
        resetDate: resetDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('❌ [Credit] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get credit info',
    });
  }
});

export default router;
