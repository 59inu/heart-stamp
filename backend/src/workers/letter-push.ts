/**
 * Letter Push Worker
 *
 * 매월 1일에 실행되어, 오늘 생성된 편지에 대한 푸시 알림을 발송합니다.
 *
 * Railway Cron (UTC): 59 0 28-31 * * → KST 1일 09:59에 실행
 * - KST 기준 1일인지 확인 후 실제 작업 수행
 */

import dotenv from 'dotenv';
dotenv.config();

import { LetterJob } from '../jobs/letterJob';

function isFirstDayOfMonthKST(): boolean {
  // 한국 시간 기준으로 1일인지 확인
  const koreaTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return koreaTime.getDate() === 1;
}

async function main() {
  console.log('📨 [Letter Push Worker] Starting...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  // KST 기준 1일이 아니면 스킵
  if (!isFirstDayOfMonthKST()) {
    console.log('⏭️  [Letter Push Worker] Not the 1st day of month (KST), skipping...');
    process.exit(0);
  }

  console.log('✅ [Letter Push Worker] Confirmed 1st day of month (KST)');

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
