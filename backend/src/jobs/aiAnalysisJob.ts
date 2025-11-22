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

    // 새벽 3시 AI 코멘트 배치 생성 (어제 날짜 일기 분석)
    cron.schedule('0 3 * * *', async () => {
      console.log('🤖 Running scheduled batch analysis at 3:00 AM...');
      await this.runBatchAnalysis();
    });

    // 아침 8시 30분 일괄 푸시 알림 전송 (어제 일기 작성한 사용자만)
    cron.schedule('30 8 * * *', async () => {
      console.log('\n' + '📱'.repeat(40));
      console.log('📬 [PUSH] NOTIFICATION DELIVERY STARTED');
      console.log('📱'.repeat(40));
      console.log(`⏰ Time: ${new Date().toISOString()}`);

      // 어제 날짜 일기 중 AI 코멘트를 받은 사용자 목록 조회
      const userIds = await DiaryDatabase.getUsersWithAICommentYesterday();

      console.log(`👥 Target users: ${userIds.length}`);

      if (userIds.length === 0) {
        console.log('ℹ️  [PUSH] No users wrote diary yesterday');
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
      console.log(`✅ [PUSH] NOTIFICATION SENT to ${userIds.length} users`);
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

  /**
   * 개별 일기 처리 (헬퍼 메서드)
   */
  private async processDiary(
    diary: any,
    index: number,
    total: number,
    useFallback: boolean,
    VERBOSE_LOGS: boolean
  ): Promise<{ success: boolean; comment?: string; stampType?: string }> {
    try {
      if (VERBOSE_LOGS) {
        console.log(`\n📝 [${index + 1}/${total}] Analyzing diary ${diary._id}...`);
        console.log(`   Date: ${diary.date}`);
        console.log(`   Mood: ${diary.moodTag || 'neutral'}`);
        console.log(`   Content: ${diary.content.substring(0, 50)}...`);
      }

      const analysis = await this.claudeService.generateComment(
        diary.content,
        diary.moodTag || 'neutral',
        diary.date,
        { useFallback }
      );

      await DiaryDatabase.update(diary._id, {
        aiComment: analysis.comment,
        stampType: analysis.stampType,
        model: analysis.model,
        importanceScore: analysis.importanceScore,
        isFallbackComment: analysis.isFallbackComment,
        syncedWithServer: true,
      });

      if (VERBOSE_LOGS) {
        console.log(`   ✅ Comment: "${analysis.comment.substring(0, 40)}..."`);
        console.log(`   🏆 Stamp: ${analysis.stampType}`);
      }

      return { success: true, comment: analysis.comment, stampType: analysis.stampType };
    } catch (error) {
      console.error(`\n❌ [BATCH] Failed [${index + 1}/${total}] diary ${diary._id}:`, error);
      return { success: false };
    }
  }

  async runBatchAnalysis() {
    if (this.isRunning) {
      console.log('⏭️  [BATCH] Already running, skipping...');
      return;
    }

    this.isRunning = true;

    // 환경변수로 로그 상세도 조절
    const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';
    const BATCH_LOG_INTERVAL = parseInt(process.env.BATCH_LOG_INTERVAL || '10', 10);
    const RETRY_DELAY = 5 * 60 * 1000; // 5분 대기

    console.log('\n' + '🔊'.repeat(40));
    console.log('🔊🔊🔊 [BATCH] 배치 작업 시작!!! 🔊🔊🔊');
    console.log('🔊'.repeat(40));
    console.log('\n' + '='.repeat(80));
    console.log('🤖 [BATCH] AI COMMENT GENERATION STARTED (3-PASS RETRY SYSTEM)');
    console.log('='.repeat(80));
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`🌏 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    try {
      // Get all diaries without AI comments
      console.log('🔍 [BATCH] Getting pending diaries from database...');
      const pendingDiaries = await DiaryDatabase.getPending();
      const total = pendingDiaries.length;

      console.log(`📊 Total diaries to analyze: ${total}`);

      if (total === 0) {
        console.log('ℹ️  [BATCH] No diaries to process');
        console.log('='.repeat(80) + '\n');
        return;
      }

      const startTime = Date.now();
      let currentBatch = pendingDiaries;

      // ===== 1차 배치 =====
      console.log('\n' + '🎯'.repeat(40));
      console.log('🎯 [PASS 1/3] FIRST ATTEMPT');
      console.log('🎯'.repeat(40));

      let failedDiaries: any[] = [];
      let successCount = 0;

      for (let i = 0; i < currentBatch.length; i++) {
        const diary = currentBatch[i];
        const result = await this.processDiary(diary, i, currentBatch.length, false, VERBOSE_LOGS);

        if (result.success) {
          successCount++;

          // 진행률 로그
          const shouldLogProgress = (i + 1) % BATCH_LOG_INTERVAL === 0 || (i + 1) === currentBatch.length;
          if (shouldLogProgress && !VERBOSE_LOGS) {
            const processed = i + 1;
            console.log(`\n📊 [PASS 1] Progress: ${processed}/${currentBatch.length} (${Math.round(processed/currentBatch.length*100)}%)`);
            console.log(`   Latest: "${result.comment?.substring(0, 40)}..." (${result.stampType})`);
            console.log(`   Success: ${successCount}/${processed}`);
          }
        } else {
          failedDiaries.push(diary);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log('\n' + '📊'.repeat(40));
      console.log(`✅ [PASS 1] Complete: ${successCount} success, ${failedDiaries.length} failed`);
      console.log('📊'.repeat(40));

      // ===== 2차 재시도 =====
      if (failedDiaries.length > 0) {
        console.log(`\n⏳ [RETRY] Waiting ${RETRY_DELAY / 1000}s before 2nd attempt...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

        console.log('\n' + '🎯'.repeat(40));
        console.log('🎯 [PASS 2/3] SECOND ATTEMPT');
        console.log('🎯'.repeat(40));

        currentBatch = failedDiaries;
        failedDiaries = [];

        for (let i = 0; i < currentBatch.length; i++) {
          const diary = currentBatch[i];
          const result = await this.processDiary(diary, i, currentBatch.length, false, VERBOSE_LOGS);

          if (result.success) {
            successCount++;

            const shouldLogProgress = (i + 1) % BATCH_LOG_INTERVAL === 0 || (i + 1) === currentBatch.length;
            if (shouldLogProgress && !VERBOSE_LOGS) {
              console.log(`\n📊 [PASS 2] Progress: ${i + 1}/${currentBatch.length}`);
              console.log(`   Recovered: "${result.comment?.substring(0, 40)}..."`);
            }
          } else {
            failedDiaries.push(diary);
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log('\n' + '📊'.repeat(40));
        console.log(`✅ [PASS 2] Complete: ${currentBatch.length - failedDiaries.length} recovered, ${failedDiaries.length} still failed`);
        console.log('📊'.repeat(40));
      }

      // ===== 3차 재시도 =====
      if (failedDiaries.length > 0) {
        console.log(`\n⏳ [RETRY] Waiting ${RETRY_DELAY / 1000}s before 3rd attempt...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

        console.log('\n' + '🎯'.repeat(40));
        console.log('🎯 [PASS 3/3] FINAL ATTEMPT (WITH FALLBACK)');
        console.log('🎯'.repeat(40));

        currentBatch = failedDiaries;
        failedDiaries = [];

        for (let i = 0; i < currentBatch.length; i++) {
          const diary = currentBatch[i];
          // 3차에는 useFallback=true로 반드시 저장
          const result = await this.processDiary(diary, i, currentBatch.length, true, VERBOSE_LOGS);

          if (result.success) {
            successCount++;

            const shouldLogProgress = (i + 1) % BATCH_LOG_INTERVAL === 0 || (i + 1) === currentBatch.length;
            if (shouldLogProgress && !VERBOSE_LOGS) {
              console.log(`\n📊 [PASS 3] Progress: ${i + 1}/${currentBatch.length}`);
              console.log(`   Saved: "${result.comment?.substring(0, 40)}..."`);
            }
          } else {
            failedDiaries.push(diary);
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log('\n' + '📊'.repeat(40));
        console.log(`✅ [PASS 3] Complete: ${currentBatch.length - failedDiaries.length} saved, ${failedDiaries.length} permanently failed`);
        console.log('📊'.repeat(40));
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      const avgTime = total > 0 ? Math.round(duration / total) : 0;

      console.log('\n' + '='.repeat(80));
      console.log('🎉 [BATCH] AI COMMENT GENERATION COMPLETED');
      console.log('='.repeat(80));
      console.log(`✅ Successful: ${successCount} diaries`);
      console.log(`❌ Permanently failed: ${failedDiaries.length} diaries`);
      console.log(`📊 Total processed: ${total} diaries`);
      console.log(`⏱️  Duration: ${duration}s (avg ${avgTime}s per diary)`);
      console.log(`📈 Success rate: ${Math.round((successCount / total) * 100)}%`);
      console.log(`⏰ Finished at: ${new Date().toISOString()}`);
      console.log(`📱 Push notifications will be sent at 8:30 AM`);
      console.log('='.repeat(80) + '\n');

      if (failedDiaries.length > 0) {
        console.warn('⚠️  [BATCH] Some diaries could not be processed even after 3 attempts:');
        failedDiaries.forEach(d => console.warn(`   - ${d._id} (${d.date})`));
      }
    } catch (error) {
      console.error('\n' + '❌'.repeat(40));
      console.error('💥 [BATCH] CRITICAL ERROR in batch analysis:', error);
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
