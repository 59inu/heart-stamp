/**
 * AI Batch Worker
 *
 * 매일 새벽 3시에 실행되어, 어제 작성된 일기에 대해
 * AI 코멘트를 생성합니다.
 *
 * Railway Cron: 0 3 * * * (Asia/Seoul)
 */

import dotenv from 'dotenv';
dotenv.config();

import { ClaudeService } from '../services/claudeService';
import { DiaryDatabase } from '../services/database';

async function main() {
  console.log('\n' + '🔊'.repeat(40));
  console.log('🔊🔊🔊 [AI Batch Worker] 시작!!! 🔊🔊🔊');
  console.log('🔊'.repeat(40));
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🌏 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  // 환경변수로 로그 상세도 조절
  const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';
  const BATCH_LOG_INTERVAL = parseInt(process.env.BATCH_LOG_INTERVAL || '10', 10);

  // Claude Service 초기화
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) {
    console.error('❌ [AI Batch Worker] CLAUDE_API_KEY is not set');
    process.exit(1);
  }

  const claudeService = new ClaudeService(CLAUDE_API_KEY);

  try {
    // Get all diaries without AI comments
    console.log('🔍 [AI Batch Worker] Getting pending diaries from database...');
    const pendingDiaries = await DiaryDatabase.getPending();
    const total = pendingDiaries.length;

    console.log(`📊 Total diaries to analyze: ${total}`);

    if (total === 0) {
      console.log('ℹ️  [AI Batch Worker] No diaries to process');
      console.log('='.repeat(80) + '\n');
      process.exit(0);
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

        const analysis = await claudeService.generateComment(
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
          console.log(`\n📊 [AI Batch Worker] Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
          console.log(`   Latest comment: "${analysis.comment.substring(0, 40)}..." (${analysis.stampType})`);
          console.log(`   Success rate: ${successRate}%`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        failCount++;
        // 에러는 항상 로그 (중요!)
        console.error(`\n❌ [AI Batch Worker] Failed [${i + 1}/${total}] diary ${diary._id}:`, error);
        // Continue with next diary even if one fails
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const avgTime = Math.round(duration / total);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 [AI Batch Worker] COMPLETED');
    console.log('='.repeat(80));
    console.log(`✅ Successful: ${successCount} diaries`);
    console.log(`❌ Failed: ${failCount} diaries`);
    console.log(`📊 Total processed: ${total} diaries`);
    console.log(`⏱️  Duration: ${duration}s (avg ${avgTime}s per diary)`);
    console.log(`📈 Success rate: ${Math.round((successCount / total) * 100)}%`);
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '❌'.repeat(40));
    console.error('💥 [AI Batch Worker] CRITICAL ERROR:', error);
    console.error('❌'.repeat(40) + '\n');
    process.exit(1);
  }
}

main();
