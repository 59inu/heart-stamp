/**
 * Letter Push Worker
 *
 * 매월 1일 아침 9시에 실행되어, 오늘 새벽에 생성된 편지에 대한
 * 푸시 알림을 발송합니다.
 *
 * Railway Cron: 0 9 1 * * (Asia/Seoul)
 */

import dotenv from 'dotenv';
dotenv.config();

import { LetterJob } from '../jobs/letterJob';

async function main() {
  console.log('📨 [Letter Push Worker] Starting...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  try {
    await LetterJob.sendLetterNotifications();
    console.log('✅ [Letter Push Worker] Completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Letter Push Worker] Failed:', error);
    process.exit(1);
  }
}

main();
