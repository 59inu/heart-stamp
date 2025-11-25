/**
 * Letter Generate Worker
 *
 * 매월 1일 새벽 4시에 실행되어, 이전 달 5회 이상 일기를 작성한
 * 사용자에게 AI로 개인화된 편지를 생성합니다.
 *
 * Railway Cron: 0 4 1 * * (Asia/Seoul)
 */

import dotenv from 'dotenv';
dotenv.config();

import { ClaudeService } from '../services/claudeService';
import { LetterJob } from '../jobs/letterJob';

async function main() {
  console.log('📬 [Letter Generate Worker] Starting...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);

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
