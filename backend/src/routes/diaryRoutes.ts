import { Router, Request, Response } from 'express';
import { ClaudeService } from '../services/claudeService';
import { DiaryEntry } from '../types/diary';

const router = Router();

// In-memory storage for demonstration (in production, use a real database)
const diaries: Map<string, DiaryEntry> = new Map();

// Claude service instance
let claudeService: ClaudeService;

export function initializeClaudeService(apiKey: string) {
  claudeService = new ClaudeService(apiKey);
}

// Upload diary from mobile app
router.post('/diaries', async (req: Request, res: Response) => {
  try {
    const diaryEntry: DiaryEntry = req.body;
    diaries.set(diaryEntry._id, diaryEntry);

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
});

// Get AI comment for a specific diary
router.get('/diaries/:id/ai-comment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diary = diaries.get(id);

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
});

// Manually trigger AI analysis for a specific diary (for testing)
router.post('/diaries/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diary = diaries.get(id);

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

    diary.aiComment = analysis.comment;
    diary.stampType = analysis.stampType;
    diary.syncedWithServer = true;
    diaries.set(id, diary);

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
});

// Get all diaries that need AI analysis
router.get('/diaries/pending', async (req: Request, res: Response) => {
  try {
    const pendingDiaries = Array.from(diaries.values()).filter(
      (diary) => !diary.aiComment
    );

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

export { diaries };
export default router;
