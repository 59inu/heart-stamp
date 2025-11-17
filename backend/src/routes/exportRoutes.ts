import express, { Request, Response } from 'express';
import { ExportJobDatabase } from '../services/exportDatabase';
import { ExportFormat, ExportRequest } from '../types/export';
import { DiaryDatabase } from '../services/database';
import { requireFirebaseAuth } from '../middleware/auth';

const router = express.Router();

/**
 * Request data export
 *
 * POST /api/export/request
 * Body: { format: 'txt' | 'pdf' }
 */
router.post('/export/request', requireFirebaseAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const { format }: ExportRequest = req.body;

    // Validate format
    if (!format || (format !== 'txt' && format !== 'pdf')) {
      res.status(400).json({ error: 'Invalid format. Must be "txt" or "pdf"' });
      return;
    }

    // TODO: Check if user has premium subscription for PDF
    if (format === 'pdf') {
      res.status(403).json({ error: 'PDF export is available for premium users only' });
      return;
    }

    // Check if user has any diaries
    const diaries = await DiaryDatabase.getAllByUserId(userId);
    if (diaries.length === 0) {
      res.status(400).json({ error: '내보낼 일기 데이터가 없습니다' });
      return;
    }

    // Check if there's already a pending or processing job
    const existingJobs = ExportJobDatabase.getAllForUser(userId);
    const activeJob = existingJobs.find(
      (job) => job.status === 'pending' || job.status === 'processing'
    );

    if (activeJob) {
      res.status(409).json({
        error: '이미 진행 중인 내보내기 요청이 있습니다',
        jobId: activeJob.id,
      });
      return;
    }

    // Create export job
    const job = ExportJobDatabase.create(userId, format as ExportFormat);

    res.status(202).json({
      message: '내보내기 요청이 접수되었습니다. 24시간 내에 완료됩니다.',
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  } catch (error: any) {
    console.error('❌ [ExportRoutes] Failed to create export request:', error);
    res.status(500).json({ error: error.message || 'Failed to create export request' });
  }
});

/**
 * Get export job status
 *
 * GET /api/export/status/:jobId
 */
router.get('/export/status/:jobId', requireFirebaseAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { jobId } = req.params;

    const job = ExportJobDatabase.get(jobId);

    if (!job) {
      res.status(404).json({ error: 'Export job not found' });
      return;
    }

    // Verify user owns this job
    if (job.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    res.json({
      id: job.id,
      status: job.status,
      format: job.format,
      s3Url: job.s3Url,
      expiresAt: job.expiresAt,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error: any) {
    console.error('❌ [ExportRoutes] Failed to get export status:', error);
    res.status(500).json({ error: error.message || 'Failed to get export status' });
  }
});

/**
 * Get all export jobs for user
 *
 * GET /api/export/jobs
 */
router.get('/export/jobs', requireFirebaseAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const jobs = ExportJobDatabase.getAllForUser(userId);

    res.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        status: job.status,
        format: job.format,
        s3Url: job.s3Url,
        expiresAt: job.expiresAt,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('❌ [ExportRoutes] Failed to get export jobs:', error);
    res.status(500).json({ error: error.message || 'Failed to get export jobs' });
  }
});

/**
 * Delete all user data
 *
 * DELETE /api/export/delete-all
 */
router.delete('/export/delete-all', requireFirebaseAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Delete all diaries
    const deletedDiaries = await DiaryDatabase.deleteAllForUser(userId);

    // Delete all export jobs
    const deletedJobs = ExportJobDatabase.deleteAllForUser(userId);

    console.log(
      `🗑️  [ExportRoutes] Deleted all data for user ${userId}: ${deletedDiaries} diaries, ${deletedJobs} export jobs`
    );

    res.json({
      message: '모든 데이터가 삭제되었습니다',
      deletedDiaries,
      deletedJobs,
    });
  } catch (error: any) {
    console.error('❌ [ExportRoutes] Failed to delete user data:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user data' });
  }
});

export default router;
