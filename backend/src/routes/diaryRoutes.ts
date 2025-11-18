import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { ClaudeService } from '../services/claudeService';
import { DiaryEntry } from '../types/diary';
import { DiaryDatabase } from '../services/database';
import { aiAnalysisLimiter } from '../middleware/rateLimiter';
import { requireFirebaseAuth, requireAdminToken } from '../middleware/auth';

const router = Router();

// Claude service instance
let claudeService: ClaudeService;

export function initializeClaudeService(apiKey: string) {
  claudeService = new ClaudeService(apiKey);
}

// Upload diary from mobile app
router.post('/diaries',
  // Input validation
  body('_id').isString().trim().notEmpty(),
  body('date').isISO8601().withMessage('Invalid date format'),
  body('content').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Content must be between 1 and 10000 characters'),
  body('weather').optional().isString().trim(),
  body('mood').optional().isIn(['red', 'yellow', 'green']).withMessage('Invalid mood value'),
  body('moodTag').optional().isString().trim().isLength({ max: 100 }),
  body('createdAt').isISO8601(),
  body('updatedAt').isISO8601(),
  async (req: Request, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    try {
      // X-User-Id 헤더에서 userId 추출
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const diaryEntry: DiaryEntry = {
        ...req.body,
        userId, // X-User-Id 헤더의 userId로 설정
      };

      // 기존 일기가 있으면 업데이트, 없으면 생성
      const existing = DiaryDatabase.getById(diaryEntry._id);
      if (existing) {
        // update 시 X-User-Id 헤더의 userId를 명시적으로 전달하여 덮어쓰기
        await DiaryDatabase.update(diaryEntry._id, {
          ...diaryEntry,
          userId, // X-User-Id 헤더의 userId 강제 적용
        });
      } else {
        await DiaryDatabase.create(diaryEntry);
      }

      res.status(201).json({
        success: true,
        message: 'Diary uploaded successfully',
        data: diaryEntry,
      });
    } catch (error) {
      console.error('Error uploading diary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload diary',
      });
    }
  }
);

// Get AI comment for a specific diary
router.get('/diaries/:id/ai-comment',
  param('id').isString().trim().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid diary ID',
        errors: errors.array(),
      });
    }

    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const { id } = req.params;
      const diary = DiaryDatabase.getById(id);

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: 'Diary not found',
        });
      }

      // 자신의 일기만 조회 가능
      if (diary.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden - not your diary',
        });
      }

      res.json({
        success: true,
        data: {
          aiComment: diary.aiComment,
          stampType: diary.stampType,
        },
      });
    } catch (error) {
      console.error('Error getting AI comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI comment',
      });
    }
  }
);

// Manually trigger AI analysis for a specific diary (for testing)
// AI 분석 레이트리미트 적용: 시간당 10회
router.post('/diaries/:id/analyze',
  param('id').isString().trim().notEmpty(),
  aiAnalysisLimiter,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid diary ID',
        errors: errors.array(),
      });
    }

    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const { id } = req.params;
      const diary = DiaryDatabase.getById(id);

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: 'Diary not found',
        });
      }

      // 자신의 일기만 분석 가능
      if (diary.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden - not your diary',
        });
      }

      if (!claudeService) {
        return res.status(500).json({
          success: false,
          message: 'Claude service not initialized',
        });
      }

      const analysis = await claudeService.generateComment(
        diary.content,
        diary.moodTag || 'neutral',
        diary.date
      );

      await DiaryDatabase.update(id, {
        aiComment: analysis.comment,
        stampType: analysis.stampType,
        model: analysis.model,
        importanceScore: analysis.importanceScore,
        syncedWithServer: true,
      });

      res.json({
        success: true,
        message: 'Diary analyzed successfully',
        data: {
          aiComment: analysis.comment,
          stampType: analysis.stampType,
        },
      });
    } catch (error) {
      console.error('Error analyzing diary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze diary',
      });
    }
  }
);

// Get all diaries for a specific user
router.get('/diaries', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const userDiaries = DiaryDatabase.getAllByUserId(userId);

    res.json({
      success: true,
      data: userDiaries,
    });
  } catch (error) {
    console.error('Error getting user diaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user diaries',
    });
  }
});

// Get all diaries that need AI analysis (관리용)
router.get('/diaries/pending', requireAdminToken, async (req: Request, res: Response) => {
  try {
    const pendingDiaries = DiaryDatabase.getPending();

    res.json({
      success: true,
      data: pendingDiaries,
    });
  } catch (error) {
    console.error('Error getting pending diaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending diaries',
    });
  }
});

// Delete a diary
router.delete('/diaries/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const { id } = req.params;
    const diary = DiaryDatabase.getById(id);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: 'Diary not found',
      });
    }

    // 자신의 일기만 삭제 가능
    if (diary.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - not your diary',
      });
    }

    await DiaryDatabase.delete(id);

    res.json({
      success: true,
      message: 'Diary deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting diary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete diary',
    });
  }
});

// [Admin] Generate AI comment for specific diary by date
router.post('/admin/generate-comment',
  requireAdminToken,
  body('userId').isString().trim().notEmpty(),
  body('date').isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
  aiAnalysisLimiter,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    try {
      const { userId, date } = req.body;

      // Find diary by userId and date
      const allDiaries = DiaryDatabase.getAllByUserId(userId);
      const diary = allDiaries.find(d => d.date.startsWith(date));

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: `Diary not found for user ${userId} on ${date}`,
        });
      }

      if (diary.aiComment) {
        return res.status(400).json({
          success: false,
          message: 'Diary already has AI comment. Delete it first if you want to regenerate.',
          data: { aiComment: diary.aiComment },
        });
      }

      // Generate AI comment (Admin용: 항상 Sonnet 사용)
      console.log(`🤖 [Admin] Generating AI comment for diary ${diary._id} (${date}) - SONNET FORCED`);
      const result = await claudeService.generateComment(
        diary.content,
        diary.moodTag || '',
        diary.date,
        { forceModel: 'sonnet' }
      );

      // Update diary with AI comment
      await DiaryDatabase.update(diary._id, {
        aiComment: result.comment,
        model: result.model,
        importanceScore: result.importanceScore,
        stampType: result.stampType,
      });

      res.json({
        success: true,
        message: 'AI comment generated successfully',
        data: {
          diaryId: diary._id,
          date: diary.date,
          aiComment: result.comment,
          model: result.model,
          importanceScore: result.importanceScore,
          stampType: result.stampType,
        },
      });
    } catch (error) {
      console.error('Error generating AI comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate AI comment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// [Admin] Delete AI comment for specific diary by date
router.delete('/admin/delete-comment',
  requireAdminToken,
  body('userId').isString().trim().notEmpty(),
  body('date').isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    try {
      const { userId, date } = req.body;

      // Find diary by userId and date
      const allDiaries = DiaryDatabase.getAllByUserId(userId);
      const diary = allDiaries.find(d => d.date.startsWith(date));

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: `Diary not found for user ${userId} on ${date}`,
        });
      }

      if (!diary.aiComment) {
        return res.status(400).json({
          success: false,
          message: 'Diary has no AI comment to delete.',
        });
      }

      // Delete AI comment by setting fields to undefined
      console.log(`🗑️ [Admin] Deleting AI comment for diary ${diary._id} (${date})`);
      await DiaryDatabase.update(diary._id, {
        aiComment: undefined,
        model: undefined,
        importanceScore: undefined,
        stampType: undefined,
      });

      res.json({
        success: true,
        message: 'AI comment deleted successfully',
        data: {
          diaryId: diary._id,
          date: diary.date,
        },
      });
    } catch (error) {
      console.error('Error deleting AI comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete AI comment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// [Admin] Get all diaries (for admin UI)
router.get('/admin/diaries',
  requireAdminToken,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'userId query parameter is required',
        });
      }

      const userDiaries = DiaryDatabase.getAllByUserId(userId);

      res.json({
        success: true,
        data: userDiaries,
      });
    } catch (error) {
      console.error('Error fetching admin diaries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch diaries',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// [Admin] Get recent AI comments
router.get('/admin/recent-comments',
  requireAdminToken,
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const comments = DiaryDatabase.getRecentAIComments(limit);

      res.json({
        success: true,
        data: comments,
      });
    } catch (error) {
      console.error('Error fetching recent comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent comments',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);


// [Admin] Get database statistics
router.get('/admin/stats',
  requireAdminToken,
  async (req: Request, res: Response) => {
    try {
      const stats = DiaryDatabase.getStats();
      const modelStats = DiaryDatabase.getModelStats();

      res.json({
        success: true,
        data: {
          ...stats,
          ...modelStats,
        },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
