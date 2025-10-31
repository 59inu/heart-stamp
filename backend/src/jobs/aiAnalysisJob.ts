import cron from 'node-cron';
import { ClaudeService } from '../services/claudeService';
import { PushNotificationService } from '../services/pushNotificationService';
import { diaries } from '../routes/diaryRoutes';

export class AIAnalysisJob {
  private claudeService: ClaudeService;
  private pushNotificationService: PushNotificationService;
  private isRunning: boolean = false;

  constructor(
    claudeService: ClaudeService,
    pushNotificationService: PushNotificationService
  ) {
    this.claudeService = claudeService;
    this.pushNotificationService = pushNotificationService;
  }

  // Schedule the job to run every night at 2 AM
  start() {
    console.log('Starting AI Analysis Job scheduler...');

    // Run at 10:35 PM every day (for testing)
    cron.schedule('35 22 * * *', async () => {
      console.log('Running scheduled batch analysis at 10:35 PM...');
      await this.runBatchAnalysis();
    });

    console.log('AI Analysis Job scheduler started.');
    console.log('- Scheduled: Every day at 10:35 PM');
    console.log('- Manual trigger: POST http://localhost:3000/api/jobs/trigger-analysis');
  }

  async runBatchAnalysis() {
    if (this.isRunning) {
      console.log('Batch analysis already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting batch AI analysis...');

    try {
      // Get all diaries without AI comments
      const pendingDiaries = Array.from(diaries.values()).filter(
        (diary) => !diary.aiComment
      );

      console.log(`Found ${pendingDiaries.length} diaries to analyze`);

      for (const diary of pendingDiaries) {
        try {
          console.log(`Analyzing diary ${diary._id}...`);

          const analysis = await this.claudeService.analyzeDiary(
            diary.content,
            diary.date
          );

          diary.aiComment = analysis.comment;
          diary.stampType = analysis.stampType;
          diary.syncedWithServer = true;

          diaries.set(diary._id, diary);

          console.log(`Successfully analyzed diary ${diary._id}`);

          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error analyzing diary ${diary._id}:`, error);
          // Continue with next diary even if one fails
        }
      }

      console.log('Batch AI analysis completed');

      // 푸시 알림 전송
      if (pendingDiaries.length > 0) {
        console.log('📬 푸시 알림 전송 중...');
        await this.pushNotificationService.sendAICommentNotification();
        console.log('✅ 푸시 알림 전송 완료');
      }
    } catch (error) {
      console.error('Error in batch analysis:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Manual trigger for testing
  async triggerManually() {
    console.log('Manually triggering batch analysis...');
    await this.runBatchAnalysis();
  }
}
