import express, { Request, Response } from 'express';
import { DiaryDatabase } from '../services/database';

const router = express.Router();

const MONTHLY_LIMIT = 5;

/**
 * TZ 환경변수 기준 현재 시각 가져오기
 */
function getCurrentTime(): Date {
  const tzOffset = process.env.TZ ? new Date().getTimezoneOffset() * -1 : 0;
  const now = new Date();
  return new Date(now.getTime() + tzOffset * 60 * 1000);
}

/**
 * 현재 월의 시작과 끝 계산 (TZ 환경변수 기준)
 */
function getMonthRange() {
  const now = getCurrentTime();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 로컬 타임존 기준 월 시작/끝
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const resetDate = new Date(year, month + 1, 1, 0, 0, 0, 0);

  return { monthStart, monthEnd, resetDate };
}

/**
 * 사용자의 이번 달 크레딧 사용량 확인
 */
export async function checkUserCredit(userId: string): Promise<{ used: number; remaining: number; limit: number }> {
  const { monthStart, monthEnd } = getMonthRange();

  // 이번 달에 생성 완료된 그림일기만 조회 (성능 최적화)
  const diaries = await DiaryDatabase.getAllByUserId(userId);
  const usedCount = diaries.filter((diary: any) => {
    if (diary.imageGenerationStatus !== 'completed') return false;

    const diaryDate = new Date(diary.createdAt);
    return diaryDate >= monthStart && diaryDate <= monthEnd;
  }).length;

  const remaining = Math.max(0, MONTHLY_LIMIT - usedCount);

  return {
    used: usedCount,
    remaining,
    limit: MONTHLY_LIMIT,
  };
}

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

    const { monthStart, monthEnd, resetDate } = getMonthRange();

    console.log(`🎨 [Credit] Checking credit for user ${userId}`);
    console.log(`📅 [Credit] Month range (${process.env.TZ || 'UTC'}): ${monthStart.toISOString()} ~ ${monthEnd.toISOString()}`);

    const credit = await checkUserCredit(userId);

    console.log(`✅ [Credit] Used: ${credit.used}/${credit.limit}, Remaining: ${credit.remaining}`);

    res.json({
      success: true,
      data: {
        used: credit.used,
        limit: credit.limit,
        remaining: credit.remaining,
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
