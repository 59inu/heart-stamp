import cron from 'node-cron';
import { ClaudeService } from '../services/claudeService';
import { diaries } from '../routes/diaryRoutes';

export class AIAnalysisJob {
  private claudeService: ClaudeService;
  private isRunning: boolean = false;

  constructor(claudeService: ClaudeService) {
    this.claudeService = claudeService;
  }

  // Schedule the job to run every night at 2 AM
  start() {
    console.log('Starting AI Analysis Job scheduler...');

    // Run at 2 AM every day
    cron.schedule('0 2 * * *', async () => {
      await this.runBatchAnalysis();
    });

    // For testing: also run every 5 minutes (commented out in production)
    // cron.schedule('*/5 * * * *', async () => {
    //   console.log('Running test batch analysis...');
    //   await this.runBatchAnalysis();
    // });

    console.log('AI Analysis Job scheduler started. Will run at 2 AM daily.');
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
