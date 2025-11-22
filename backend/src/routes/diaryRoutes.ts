import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { ClaudeService } from '../services/claudeService';
import { ImageGenerationService } from '../services/imageGenerationService';
import { DiaryEntry } from '../types/diary';
import { DiaryDatabase } from '../services/database';
import { aiAnalysisLimiter } from '../middleware/rateLimiter';
import { requireFirebaseAuth, requireAdminToken } from '../middleware/auth';

const router = Router();

// Claude service instance
let claudeService: ClaudeService;
let imageGenerationService: ImageGenerationService | null = null;

export function initializeClaudeService(apiKey: string) {
  claudeService = new ClaudeService(apiKey);
}

export function initializeImageGenerationService(
  claudeApiKey: string,
  nanobananaApiKey: string,
  referenceImageUrl?: string,
  callbackUrl?: string
) {
  imageGenerationService = new ImageGenerationService(claudeApiKey, nanobananaApiKey, referenceImageUrl, callbackUrl);
  console.log('✅ ImageGenerationService initialized');
  if (callbackUrl) {
    console.log('🔔 Callback URL configured:', callbackUrl);
  }
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
  body('imageUri').optional().isString().trim(),
  body('createdAt').isISO8601(),
  body('updatedAt').isISO8601(),
  body('generateImage').optional().isBoolean().withMessage('generateImage must be a boolean'),
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

      const { generateImage, ...diaryData } = req.body;

      console.log('📤 [Diary Upload] Received data:', {
        _id: diaryData._id,
        hasImageUri: !!diaryData.imageUri,
        imageUri: diaryData.imageUri,
        generateImage,
      });

      const diaryEntry: DiaryEntry = {
        ...diaryData,
        userId, // X-User-Id 헤더의 userId로 설정
        // 이미지 생성 요청이 있으면 상태를 pending으로 초기화
        imageGenerationStatus: generateImage ? 'pending' : undefined,
      };

      // 기존 일기가 있으면 업데이트, 없으면 생성
      const existing = await DiaryDatabase.getById(diaryEntry._id);
      if (existing) {
        // update 시 userId는 변경하지 않음 (원래 userId 보존)
        // imageGenerationStatus는 새로 이미지 생성 요청이 있을 때만 업데이트
        const { userId: _, imageGenerationStatus: __, ...updateData } = diaryEntry;

        // 새로 이미지 생성 요청이 있으면 상태를 pending으로 재설정
        if (generateImage) {
          console.log('🔄 [Diary Upload] Re-generating image for existing diary:', diaryEntry._id);
          await DiaryDatabase.update(diaryEntry._id, {
            ...updateData,
            imageGenerationStatus: 'pending',
            imageUri: undefined, // 기존 이미지 제거 (새로 생성할 것이므로)
          });
        } else {
          console.log('🔄 [Diary Upload] Updating existing diary:', {
            _id: diaryEntry._id,
            hasImageUri: !!updateData.imageUri,
            imageUri: updateData.imageUri,
          });
          await DiaryDatabase.update(diaryEntry._id, updateData);
        }
      } else {
        await DiaryDatabase.create(diaryEntry);
      }

      // 그림일기 생성 요청 시 백그라운드로 이미지 생성
      // DEV: 개발 중에는 수정 모드에서도 이미지 생성 허용
      if (generateImage && imageGenerationService) {
        console.log(`🎨 [Diary Upload] Triggering image generation for diary ${diaryEntry._id}...`);
        // 백그라운드로 실행 (await 하지 않음)
        imageGenerationService
          .generateImageForDiary(diaryEntry._id, diaryEntry.content)
          .catch((error) => {
            console.error(`❌ [Background] Image generation failed for ${diaryEntry._id}:`, error);
          });
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
      const diary = await DiaryDatabase.getById(id);

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
      const diary = await DiaryDatabase.getById(id);

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

    const userDiaries = await DiaryDatabase.getAllByUserId(userId);

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
    const pendingDiaries = await DiaryDatabase.getPending();

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
    const diary = await DiaryDatabase.getById(id);

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
      const allDiaries = await DiaryDatabase.getAllByUserId(userId);
      const diary = allDiaries.find((d: any) => d.date.startsWith(date));

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
      const allDiaries = await DiaryDatabase.getAllByUserId(userId);
      const diary = allDiaries.find((d: any) => d.date.startsWith(date));

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

      const userDiaries = await DiaryDatabase.getAllByUserId(userId);

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

// [Admin] Get ALL diaries (without userId filter) - for debugging
router.get('/admin/all-diaries',
  requireAdminToken,
  async (req: Request, res: Response) => {
    try {
      const allDiaries = await DiaryDatabase.getAll();

      // userId별로 그룹화하여 보기 쉽게
      const groupedByUser = allDiaries.reduce((acc: any, diary: any) => {
        const userId = diary.userId || 'unknown';
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push({
          _id: diary._id,
          date: diary.date,
          userId: diary.userId,
          content: diary.content.substring(0, 50) + '...',
          model: diary.model,
          importanceScore: diary.importanceScore,
          hasAiComment: !!diary.aiComment,
          stampType: diary.stampType,
          createdAt: diary.createdAt,
        });
        return acc;
      }, {} as Record<string, any[]>);

      res.json({
        success: true,
        totalCount: allDiaries.length,
        userCount: Object.keys(groupedByUser).length,
        groupedByUser,
        allDiaries: allDiaries.map((d: any) => ({
          _id: d._id,
          userId: d.userId,
          date: d.date,
          model: d.model,
          importanceScore: d.importanceScore,
          hasAiComment: !!d.aiComment,
        })),
      });
    } catch (error) {
      console.error('Error fetching all diaries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch all diaries',
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
      const comments = await DiaryDatabase.getRecentAIComments(limit);

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
      const stats = await DiaryDatabase.getStats();
      const modelStats = await DiaryDatabase.getModelStats();

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

// [Admin] Get fallback comments (폴백 코멘트 조회)
router.get('/admin/fallback-comments',
  requireAdminToken,
  async (req: Request, res: Response) => {
    try {
      const fallbackDiaries = await DiaryDatabase.getFallbackComments();

      // 사용자 정보와 함께 반환 (관리용)
      const result = fallbackDiaries.map(diary => ({
        _id: diary._id,
        userId: diary.userId,
        date: diary.date,
        content: diary.content.substring(0, 100) + '...',
        fullContent: diary.content,
        aiComment: diary.aiComment,
        stampType: diary.stampType,
        model: diary.model,
        createdAt: diary.createdAt,
        isFallbackComment: diary.isFallbackComment,
      }));

      res.json({
        success: true,
        count: result.length,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching fallback comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch fallback comments',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// [Admin] Regenerate all fallback comments (일괄 재생성)
router.post('/admin/regenerate-fallbacks',
  requireAdminToken,
  async (req: Request, res: Response) => {
    try {
      const fallbackDiaries = await DiaryDatabase.getFallbackComments();

      if (fallbackDiaries.length === 0) {
        return res.json({
          success: true,
          message: 'No fallback comments to regenerate',
          count: 0,
        });
      }

      console.log(`🔄 [Admin] Starting regeneration for ${fallbackDiaries.length} fallback comments...`);

      let successCount = 0;
      let failCount = 0;

      for (const diary of fallbackDiaries) {
        try {
          // 1. 기존 코멘트 삭제
          await DiaryDatabase.update(diary._id, {
            aiComment: undefined,
            model: undefined,
            importanceScore: undefined,
            stampType: undefined,
            isFallbackComment: undefined,
          });

          // 2. Sonnet으로 새 코멘트 생성
          const result = await claudeService.generateComment(
            diary.content,
            diary.moodTag || '',
            diary.date,
            { forceModel: 'sonnet', useFallback: true }
          );

          // 3. 새 코멘트 저장
          await DiaryDatabase.update(diary._id, {
            aiComment: result.comment,
            stampType: result.stampType,
            model: result.model,
            importanceScore: result.importanceScore,
            isFallbackComment: result.isFallbackComment,
          });

          successCount++;
          console.log(`✅ [Admin] Regenerated comment for diary ${diary._id} (${diary.date})`);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          failCount++;
          console.error(`❌ [Admin] Failed to regenerate comment for diary ${diary._id}:`, error);
        }
      }

      console.log(`✅ [Admin] Regeneration complete: ${successCount} success, ${failCount} failed`);

      res.json({
        success: true,
        message: 'Fallback comments regeneration completed',
        total: fallbackDiaries.length,
        successCount,
        failCount,
      });
    } catch (error) {
      console.error('Error regenerating fallback comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to regenerate fallback comments',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
