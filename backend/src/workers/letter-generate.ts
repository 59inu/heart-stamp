/**
 * Letter Generate Worker
 *
 * 매월 1일에 실행되어, 이전 달 5회 이상 일기를 작성한
 * 사용자에게 AI로 개인화된 편지를 생성합니다.
 *
 * Railway Cron (UTC): 59 0 28-31 * * → KST 1일 09:59에 실행
 * - KST 기준 1일인지 확인 후 실제 작업 수행
 */

import dotenv from 'dotenv';
dotenv.config();

import { ClaudeService } from '../services/claudeService';
import { LetterJob } from '../jobs/letterJob';

function isFirstDayOfMonthKST(): boolean {
  // 한국 시간 기준으로 1일인지 확인
  const koreaTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return koreaTime.getDate() === 1;
}

async function main() {
  console.log('📬 [Letter Generate Worker] Starting...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  // KST 기준 1일이 아니면 스킵
  if (!isFirstDayOfMonthKST()) {
    console.log('⏭️  [Letter Generate Worker] Not the 1st day of month (KST), skipping...');
    process.exit(0);
  }

  console.log('✅ [Letter Generate Worker] Confirmed 1st day of month (KST)');

  // Claude Service 초기화
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) {
    console.error('❌ [Letter Generate Worker] CLAUDE_API_KEY is not set');
    process.exit(1);
  }

  const claudeService = new ClaudeService(CLAUDE_API_KEY);
  LetterJob.initialize(claudeService);

  try {
    await LetterJob.generateMonthlyLetters();
    console.log('✅ [Letter Generate Worker] Completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Letter Generate Worker] Failed:', error);
    process.exit(1);
  }
}

main();
