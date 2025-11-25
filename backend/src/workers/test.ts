/**
 * Test Worker
 * 워커 설정이 정상 작동하는지 확인용
 */

import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('🧪 [Test Worker] Started');
  console.log(`⏰ UTC: ${new Date().toISOString()}`);
  console.log(`⏰ KST: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔑 CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? '설정됨' : '없음'}`);
  console.log('✅ [Test Worker] Completed');
  process.exit(0);
}

main();
