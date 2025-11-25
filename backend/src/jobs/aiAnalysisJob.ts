import { ClaudeService } from '../services/claudeService';
import { DiaryDatabase } from '../services/database';

export class AIAnalysisJob {
  private claudeService: ClaudeService;
  private isRunning: boolean = false;

  constructor(claudeService: ClaudeService) {
    this.claudeService = claudeService;
  }

  // Cron jobs moved to separate workers (Railway Cron)
  // This method is kept for backward compatibility but does nothing now
  start() {
    console.log('AI Analysis Job initialized (cron jobs moved to workers)');
    console.log('- Manual trigger: POST http://localhost:3000/api/jobs/trigger-analysis');
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

    console.log('\n' + '🔊'.repeat(40));
    console.log('🔊🔊🔊 [BATCH] 배치 작업 시작!!! 🔊🔊🔊');
    console.log('🔊'.repeat(40));
    console.log('\n' + '='.repeat(80));
    console.log('🤖 [BATCH] AI COMMENT GENERATION STARTED');
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

      let successCount = 0;
      let failCount = 0;
      const startTime = Date.now();

      for (let i = 0; i < total; i++) {
        const diary = pendingDiaries[i];

        try {
          if (VERBOSE_LOGS) {
            console.log(`\n📝 [${i + 1}/${total}] Analyzing diary ${diary._id}...`);
            console.log(`   Date: ${diary.date}`);
            console.log(`   Mood: ${diary.moodTag || 'neutral'}`);
            console.log(`   Content: ${diary.content.substring(0, 50)}...`);
          }

          const analysis = await this.claudeService.generateComment(
            diary.content,
            diary.moodTag || 'neutral',
            diary.date
          );

          await DiaryDatabase.update(diary._id, {
            aiComment: analysis.comment,
            stampType: analysis.stampType,
            model: analysis.model,
            importanceScore: analysis.importanceScore,
            syncedWithServer: true,
          });

          successCount++;

          if (VERBOSE_LOGS) {
            console.log(`   ✅ Comment: "${analysis.comment.substring(0, 40)}..."`);
            console.log(`   🏆 Stamp: ${analysis.stampType}`);
          }

          // N개마다 또는 마지막에 진행률 표시
          const shouldLogProgress = (i + 1) % BATCH_LOG_INTERVAL === 0 || (i + 1) === total;

          if (shouldLogProgress && !VERBOSE_LOGS) {
            const processed = successCount + failCount;
            const successRate = Math.round((successCount / processed) * 100);
            console.log(`\n📊 [BATCH] Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
            console.log(`   Latest comment: "${analysis.comment.substring(0, 40)}..." (${analysis.stampType})`);
            console.log(`   Success rate: ${successRate}%`);
          }

          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          failCount++;
          // 에러는 항상 로그 (중요!)
          console.error(`\n❌ [BATCH] Failed [${i + 1}/${total}] diary ${diary._id}:`, error);
          // Continue with next diary even if one fails
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      const avgTime = Math.round(duration / total);

      console.log('\n' + '='.repeat(80));
      console.log('🎉 [BATCH] AI COMMENT GENERATION COMPLETED');
      console.log('='.repeat(80));
      console.log(`✅ Successful: ${successCount} diaries`);
      console.log(`❌ Failed: ${failCount} diaries`);
      console.log(`📊 Total processed: ${total} diaries`);
      console.log(`⏱️  Duration: ${duration}s (avg ${avgTime}s per diary)`);
      console.log(`📈 Success rate: ${Math.round((successCount / total) * 100)}%`);
      console.log(`⏰ Finished at: ${new Date().toISOString()}`);
      console.log(`📱 Push notifications will be sent at 8:30 AM`);
      console.log('='.repeat(80) + '\n');
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
