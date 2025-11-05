import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { ClaudeService } from '../services/claudeService';
import { DiaryEntry } from '../types/diary';
import { DiaryDatabase } from '../services/database';
import { aiAnalysisLimiter } from '../middleware/rateLimiter';

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
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID required',
        });
      }

      const diaryEntry: DiaryEntry = {
        ...req.body,
        userId, // userId 추가
      };

      // 기존 일기가 있으면 업데이트, 없으면 생성
      const existing = DiaryDatabase.getById(diaryEntry._id);
      if (existing) {
        await DiaryDatabase.update(diaryEntry._id, diaryEntry);
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
      const { id } = req.params;
      const diary = DiaryDatabase.getById(id);

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: 'Diary not found',
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
      const { id } = req.params;
      const diary = DiaryDatabase.getById(id);

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: 'Diary not found',
        });
      }

      if (!claudeService) {
        return res.status(500).json({
          success: false,
          message: 'Claude service not initialized',
        });
      }

      const analysis = await claudeService.analyzeDiary(diary.content, diary.date);

      await DiaryDatabase.update(id, {
        aiComment: analysis.comment,
        stampType: analysis.stampType,
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
      return res.status(400).json({
        success: false,
        message: 'User ID required',
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

// Get all diaries that need AI analysis
router.get('/diaries/pending', async (req: Request, res: Response) => {
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
    const { id } = req.params;
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

export default router;
