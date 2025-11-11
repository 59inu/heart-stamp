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

    // Run at 8:47 AM for testing - 어제 날짜 일기 분석 (원래 3:00 AM)
    cron.schedule('47 8 * * *', async () => {
      console.log('🧪 Running scheduled batch analysis at 8:47 AM (TEST)...');
      await this.runBatchAnalysis();
    });

    // 아침 8시 25분 일괄 푸시 알림 전송 (어제 일기 작성한 사용자만) - 테스트용
    cron.schedule('25 8 * * *', async () => {
      console.log('\n' + '📱'.repeat(40));
      console.log('📬 PUSH NOTIFICATION DELIVERY STARTED');
      console.log('📱'.repeat(40));
      console.log(`⏰ Time: ${new Date().toISOString()}`);

      // 어제 날짜 일기 중 AI 코멘트를 받은 사용자 목록 조회
      const userIds = DiaryDatabase.getUsersWithAICommentYesterday();

      console.log(`👥 Target users: ${userIds.length}`);

      if (userIds.length === 0) {
        console.log('ℹ️  No users wrote diary yesterday');
        console.log('📱'.repeat(40) + '\n');
        return;
      }

      // 해당 사용자들에게만 알림 전송
      await PushNotificationService.sendNotificationToUsers(
        userIds,
        '선생님 코멘트 도착 ✨',
        '밤 사이 선생님이 일기를 읽고 코멘트를 남겼어요',
        { type: 'ai_comment_complete' }
      );

      console.log('📱'.repeat(40));
      console.log(`✅ PUSH NOTIFICATION SENT to ${userIds.length} users`);
      console.log('📱'.repeat(40) + '\n');
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
      console.log('⏭️  Batch analysis already running, skipping...');
      return;
    }

    this.isRunning = true;

    console.log('\n' + '='.repeat(80));
    console.log('🤖 AI BATCH ANALYSIS STARTED');
    console.log('='.repeat(80));
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`🌏 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    try {
      // Get all diaries without AI comments
      const pendingDiaries = DiaryDatabase.getPending();

      console.log(`\n📊 Found ${pendingDiaries.length} diaries to analyze`);

      if (pendingDiaries.length === 0) {
        console.log('ℹ️  No diaries to process');
        console.log('='.repeat(80) + '\n');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const diary of pendingDiaries) {
        try {
          console.log(`\n📝 [${successCount + failCount + 1}/${pendingDiaries.length}] Analyzing diary ${diary._id}...`);
          console.log(`   Date: ${diary.date}`);
          console.log(`   Mood: ${diary.moodTag || 'neutral'}`);
          console.log(`   Content preview: ${diary.content.substring(0, 50)}...`);

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

          successCount++;
          console.log(`   ✅ SUCCESS - Comment: "${analysis.comment.substring(0, 50)}..."`);
          console.log(`   🏆 Stamp: ${analysis.stampType}`);

          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          failCount++;
          console.error(`   ❌ FAILED - Error:`, error);
          // Continue with next diary even if one fails
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('🎉 AI BATCH ANALYSIS COMPLETED');
      console.log('='.repeat(80));
      console.log(`✅ Successful: ${successCount} diaries`);
      console.log(`❌ Failed: ${failCount} diaries`);
      console.log(`📊 Total processed: ${pendingDiaries.length} diaries`);
      console.log(`⏰ Finished at: ${new Date().toISOString()}`);
      console.log(`📱 Regular push notification will be sent at 8:30 AM`);
      console.log('='.repeat(80) + '\n');
    } catch (error) {
      console.error('\n' + '❌'.repeat(40));
      console.error('💥 CRITICAL ERROR in batch analysis:', error);
      console.error('❌'.repeat(40) + '\n');
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
