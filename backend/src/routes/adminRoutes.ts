import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { DiaryDatabase } from '../services/database';
import { requireAdminToken } from '../middleware/auth';
import { aiAnalysisLimiter } from '../middleware/rateLimiter';
import { ClaudeService } from '../services/claudeService';
import { decryptFields } from '../services/encryptionService';

const router = Router();

// 모든 admin 라우트에 인증 미들웨어 적용
router.use(requireAdminToken);

// Claude service instance
let claudeService: ClaudeService;

export function initializeAdminClaudeService(apiKey: string) {
  claudeService = new ClaudeService(apiKey);
}

// ============================================
// 코멘트 관련 API
// ============================================

/**
 * 코멘트 목록 조회
 * GET /api/admin/comments
 */
router.get('/comments',
  query('startDate').optional().isISO8601().withMessage('Invalid startDate format (YYYY-MM-DD)'),
  query('endDate').optional().isISO8601().withMessage('Invalid endDate format (YYYY-MM-DD)'),
  query('status').optional().isIn(['normal', 'fallback', 'all']).withMessage('status must be normal, fallback, or all'),
  query('decrypt').optional().isBoolean().withMessage('decrypt must be boolean'),
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
      const {
        startDate,
        endDate,
        status = 'all',
        decrypt = 'false',
      } = req.query;

      const shouldDecrypt = decrypt === 'true';

      const comments = await DiaryDatabase.getCommentsForAdmin({
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as 'normal' | 'fallback' | 'all',
        decrypt: shouldDecrypt,
      });

      res.json({
        success: true,
        count: comments.length,
        data: comments,
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch comments',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 코멘트 생성
 * POST /api/admin/comments/:diaryId
 * 코멘트가 없는 일기에 수동으로 코멘트 생성
 */
router.post('/comments/:diaryId',
  param('diaryId').isString().trim().notEmpty(),
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
      const { diaryId } = req.params;

      const diary = await DiaryDatabase.getById(diaryId);

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: `Diary not found: ${diaryId}`,
        });
      }

      // 이미 코멘트가 있는 경우 409 Conflict
      if (diary.aiComment) {
        return res.status(409).json({
          success: false,
          message: 'Diary already has an AI comment. Use PUT to regenerate.',
        });
      }

      // Generate AI comment (Admin용: 항상 Sonnet 사용)
      console.log(`🤖 [Admin] Creating AI comment for diary ${diaryId} - SONNET FORCED`);
      const result = await claudeService.generateComment(
        diary.content,
        diary.moodTag || '',
        diary.date,
        { forceModel: 'sonnet' }
      );

      await DiaryDatabase.update(diaryId, {
        aiComment: result.comment,
        model: result.model,
        importanceScore: result.importanceScore,
        stampType: result.stampType,
      });

      res.status(201).json({
        success: true,
        message: 'AI comment created successfully',
        data: {
          diaryId,
          date: diary.date,
          aiComment: result.comment,
          model: result.model,
          importanceScore: result.importanceScore,
          stampType: result.stampType,
        },
      });
    } catch (error) {
      console.error('Error creating AI comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create AI comment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 코멘트 수정 (재생성)
 * PUT /api/admin/comments/:diaryId
 */
router.put('/comments/:diaryId',
  param('diaryId').isString().trim().notEmpty(),
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
      const { diaryId } = req.params;

      const diary = await DiaryDatabase.getById(diaryId);

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: `Diary not found: ${diaryId}`,
        });
      }

      // Generate AI comment (Admin용: 항상 Sonnet 사용, 기존 코멘트 덮어쓰기)
      console.log(`🤖 [Admin] Regenerating AI comment for diary ${diaryId} - SONNET FORCED`);
      const result = await claudeService.generateComment(
        diary.content,
        diary.moodTag || '',
        diary.date,
        { forceModel: 'sonnet' }
      );

      await DiaryDatabase.update(diaryId, {
        aiComment: result.comment,
        model: result.model,
        importanceScore: result.importanceScore,
        stampType: result.stampType,
      });

      res.json({
        success: true,
        message: 'AI comment regenerated successfully',
        data: {
          diaryId,
          date: diary.date,
          aiComment: result.comment,
          model: result.model,
          importanceScore: result.importanceScore,
          stampType: result.stampType,
        },
      });
    } catch (error) {
      console.error('Error regenerating AI comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to regenerate AI comment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 코멘트 삭제
 * DELETE /api/admin/comments/:diaryId
 */
router.delete('/comments/:diaryId',
  param('diaryId').isString().trim().notEmpty(),
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
      const { diaryId } = req.params;

      const diary = await DiaryDatabase.getById(diaryId);

      if (!diary) {
        return res.status(404).json({
          success: false,
          message: `Diary not found: ${diaryId}`,
        });
      }

      if (!diary.aiComment) {
        return res.status(400).json({
          success: false,
          message: 'Diary has no AI comment to delete.',
        });
      }

      console.log(`🗑️ [Admin] Deleting AI comment for diary ${diaryId}`);
      await DiaryDatabase.update(diaryId, {
        aiComment: undefined,
        model: undefined,
        importanceScore: undefined,
        stampType: undefined,
      });

      res.json({
        success: true,
        message: 'AI comment deleted successfully',
        data: {
          diaryId,
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

/**
 * 코멘트 통계 조회
 * GET /api/admin/comments/stats
 */
router.get('/comments/stats',
  async (req: Request, res: Response) => {
    try {
      const stats = await DiaryDatabase.getAdminStats();

      res.json({
        success: true,
        data: stats,
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

// ============================================
// 일기 관련 API
// ============================================

/**
 * 일기 목록 조회
 * GET /api/admin/diaries
 */
router.get('/diaries',
  query('startDate').optional().isISO8601().withMessage('Invalid startDate format (YYYY-MM-DD)'),
  query('endDate').optional().isISO8601().withMessage('Invalid endDate format (YYYY-MM-DD)'),
  query('hasComment').optional().isBoolean().withMessage('hasComment must be boolean'),
  query('userId').optional().isString().trim(),
  query('decrypt').optional().isBoolean().withMessage('decrypt must be boolean'),
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
      const {
        startDate,
        endDate,
        hasComment,
        userId,
        decrypt = 'false',
      } = req.query;

      const shouldDecrypt = decrypt === 'true';
      const hasCommentFilter = hasComment === 'true' ? true : hasComment === 'false' ? false : undefined;

      const diaries = await DiaryDatabase.getDiariesForAdmin({
        startDate: startDate as string,
        endDate: endDate as string,
        hasComment: hasCommentFilter,
        userId: userId as string,
        decrypt: shouldDecrypt,
      });

      res.json({
        success: true,
        count: diaries.length,
        data: diaries,
      });
    } catch (error) {
      console.error('Error fetching diaries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch diaries',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
