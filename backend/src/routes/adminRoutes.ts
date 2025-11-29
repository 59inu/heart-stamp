import { Router, Request, Response } from 'express';
import { param, query, body, validationResult } from 'express-validator';
import { DiaryDatabase, PromptDatabase } from '../services/database';
import { requireAdminToken } from '../middleware/auth';
import { aiAnalysisLimiter } from '../middleware/rateLimiter';
import { ClaudeService } from '../services/claudeService';
import { decryptFields } from '../services/encryptionService';
import { AnalyticsService } from '../services/analyticsService';

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

/**
 * 일기 통계 조회
 * GET /api/admin/diaries/stats
 */
router.get('/diaries/stats',
  async (req: Request, res: Response) => {
    try {
      const stats = await DiaryDatabase.getDiaryStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching diary stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch diary stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ============================================
// 프롬프트 관련 API
// ============================================

/**
 * 프롬프트 목록 조회
 * GET /api/admin/prompts
 */
router.get('/prompts',
  async (req: Request, res: Response) => {
    try {
      const prompts = await PromptDatabase.getAll();

      res.json({
        success: true,
        count: prompts.length,
        data: prompts,
      });
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch prompts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 특정 프롬프트 조회
 * GET /api/admin/prompts/:id
 */
router.get('/prompts/:id',
  param('id').isString().trim().notEmpty(),
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
      const { id } = req.params;
      const prompts = await PromptDatabase.getAll();
      const prompt = prompts.find(p => p.id === id);

      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: `Prompt not found: ${id}`,
        });
      }

      res.json({
        success: true,
        data: prompt,
      });
    } catch (error) {
      console.error('Error fetching prompt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch prompt',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 프롬프트 생성/수정
 * PUT /api/admin/prompts/:id
 */
router.put('/prompts/:id',
  param('id').isString().trim().notEmpty(),
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('content').isString().notEmpty().withMessage('content is required'),
  body('variables').optional().isArray().withMessage('variables must be an array'),
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
      const { id } = req.params;
      const { name, content, variables = [] } = req.body;

      const success = await PromptDatabase.upsert(
        id,
        name,
        content,
        variables,
        'admin' // updatedBy
      );

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to save prompt',
        });
      }

      res.json({
        success: true,
        message: 'Prompt saved successfully',
        data: {
          id,
          name,
          content,
          variables,
        },
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save prompt',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 프롬프트 캐시 초기화
 * POST /api/admin/prompts/cache/clear
 */
router.post('/prompts/cache/clear',
  async (req: Request, res: Response) => {
    try {
      PromptDatabase.clearCache();

      res.json({
        success: true,
        message: 'Prompt cache cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing prompt cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear prompt cache',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 프롬프트 버전 히스토리 조회
 * GET /api/admin/prompts/:id/history
 */
router.get('/prompts/:id/history',
  param('id').isString().trim().notEmpty(),
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
      const { id } = req.params;
      const history = await PromptDatabase.getHistory(id);

      res.json({
        success: true,
        count: history.length,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching prompt history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch prompt history',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 프롬프트 특정 버전으로 복원
 * POST /api/admin/prompts/:id/restore/:version
 */
router.post('/prompts/:id/restore/:version',
  param('id').isString().trim().notEmpty(),
  param('version').isInt({ min: 1 }).withMessage('version must be a positive integer'),
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
      const { id, version } = req.params;
      const versionNum = parseInt(version, 10);

      // 해당 버전이 존재하는지 확인
      const oldVersion = await PromptDatabase.getVersion(id, versionNum);
      if (!oldVersion) {
        return res.status(404).json({
          success: false,
          message: `Version ${version} of prompt '${id}' not found`,
        });
      }

      // 복원 실행
      const success = await PromptDatabase.restoreVersion(id, versionNum, 'admin');
      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to restore prompt version',
        });
      }

      // 복원 후 현재 프롬프트 조회
      const prompts = await PromptDatabase.getAll();
      const current = prompts.find(p => p.id === id);

      res.json({
        success: true,
        message: `Prompt '${id}' restored to version ${version}`,
        data: current,
      });
    } catch (error) {
      console.error('Error restoring prompt version:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore prompt version',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ============================================
// Analytics API (Phase 1)
// ============================================

/**
 * 일기 통계 통합 조회 (시간 패턴 + 사용자 코호트 + 빈도 분포)
 * GET /api/admin/analytics/diary-analytics
 */
router.get('/analytics/diary-analytics',
  query('year').optional().isInt().withMessage('year must be an integer'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
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
      const { year, month } = req.query;
      const data = await AnalyticsService.getDiaryAnalytics(
        year ? parseInt(year as string, 10) : undefined,
        month ? parseInt(month as string, 10) : undefined
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error fetching diary analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch diary analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 비용 예측 및 최적화 분석
 * GET /api/admin/analytics/cost-forecast
 */
router.get('/analytics/cost-forecast',
  async (req: Request, res: Response) => {
    try {
      const data = await AnalyticsService.getCostForecast();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error fetching cost forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cost forecast',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 그림일기 사용 vs 일기 작성량 상관관계 분석
 * GET /api/admin/analytics/image-correlation
 */
router.get('/analytics/image-correlation',
  async (req: Request, res: Response) => {
    try {
      const data = await AnalyticsService.getImageCorrelation();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error fetching image correlation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch image correlation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 어제 vs 오늘 일일 현황 스냅샷
 * GET /api/admin/analytics/daily-snapshot
 */
router.get('/analytics/daily-snapshot',
  async (req: Request, res: Response) => {
    try {
      const data = await AnalyticsService.getDailySnapshot();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error fetching daily snapshot:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch daily snapshot',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ============================================
// 감정 분석 API (Emotion Analytics)
// ============================================

/**
 * 감정 신호등 분포 분석
 * GET /api/admin/analytics/emotion/mood-distribution
 */
router.get('/analytics/emotion/mood-distribution', async (req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getMoodDistribution();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching mood distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mood distribution',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 감정 태그 사용 빈도 분석
 * GET /api/admin/analytics/emotion/mood-tags
 */
router.get('/analytics/emotion/mood-tags', async (req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getMoodTagStats();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching mood tag stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mood tag stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 신호등 × 감정 태그 매핑
 * GET /api/admin/analytics/emotion/mood-tag-mapping
 */
router.get('/analytics/emotion/mood-tag-mapping', async (req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getMoodTagMapping();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching mood tag mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mood tag mapping',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 사용자 감정 세그먼트 분석
 * GET /api/admin/analytics/emotion/user-segments
 */
router.get('/analytics/emotion/user-segments', async (req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getUserEmotionSegments();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching user emotion segments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user emotion segments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * AI 코멘트와 감정의 상관관계
 * GET /api/admin/analytics/emotion/ai-correlation
 */
router.get('/analytics/emotion/ai-correlation', async (req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getAIEmotionCorrelation();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching AI emotion correlation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI emotion correlation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
