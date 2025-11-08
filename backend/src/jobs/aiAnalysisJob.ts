import cron from 'node-cron';
import { ClaudeService } from '../services/claudeService';
import { PushNotificationService } from '../services/pushNotificationService';
import { DiaryDatabase } from '../services/database';

export class AIAnalysisJob {
  private claudeService: ClaudeService;
  private isRunning: boolean = false;

  constructor(claudeService: ClaudeService) {
    this.claudeService = claudeService;
  }

  // Schedule the job to run every night at 3 AM
  start() {
    console.log('Starting AI Analysis Job scheduler...');

    // Run at 3:00 AM every day - 어제 날짜 일기 분석
    cron.schedule('0 3 * * *', async () => {
      console.log('Running scheduled batch analysis at 3:00 AM...');
      await this.runBatchAnalysis();
    });

    // 아침 8시 30분 일괄 푸시 알림 전송 (어제 일기 작성한 사용자만)
    cron.schedule('30 8 * * *', async () => {
      console.log('📬 아침 8:30 - 푸시 알림 전송 시작...');

      // 어제 날짜 일기 중 AI 코멘트를 받은 사용자 목록 조회
      const userIds = DiaryDatabase.getUsersWithAICommentYesterday();

      if (userIds.length === 0) {
        console.log('ℹ️ 어제 일기를 작성한 사용자가 없어 알림을 보내지 않습니다.');
        return;
      }

      // 해당 사용자들에게만 알림 전송
      await PushNotificationService.sendNotificationToUsers(
        userIds,
        '선생님 코멘트 도착 ✨',
        '밤 사이 선생님이 일기를 읽고 코멘트를 남겼어요',
        { type: 'ai_comment_complete' }
      );
      console.log(`✅ 아침 8:30 - ${userIds.length}명에게 푸시 알림 전송 완료`);
    });

    // 15분마다 Push Notification Receipt 확인
    cron.schedule('*/15 * * * *', async () => {
      console.log('🔍 Push notification receipt check started...');
      await PushNotificationService.checkReceipts();
    });

    console.log('AI Analysis Job scheduler started.');
    console.log('- Batch Analysis: Every day at 3:00 AM (어제 날짜 일기)');
    console.log('- Morning Push: Every day at 8:30 AM (어제 일기 작성자만)');
    console.log('- Receipt Check: Every 15 minutes');
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
      const pendingDiaries = DiaryDatabase.getPending();

      console.log(`Found ${pendingDiaries.length} diaries to analyze`);

      for (const diary of pendingDiaries) {
        try {
          console.log(`Analyzing diary ${diary._id}...`);

          const analysis = await this.claudeService.analyzeDiary(
            diary.content,
            diary.moodTag || 'neutral',
            diary.date
          );

          await DiaryDatabase.update(diary._id, {
            aiComment: analysis.comment,
            stampType: analysis.stampType,
            syncedWithServer: true,
          });

          console.log(`Successfully analyzed diary ${diary._id}`);

          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error analyzing diary ${diary._id}:`, error);
          // Continue with next diary even if one fails
        }
      }

      console.log('Batch AI analysis completed');
      console.log(`📋 Processed ${pendingDiaries.length} diaries - regular push will be sent at 8:30 AM`);
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
