/**
 * Backup Worker
 *
 * 매일 새벽 4시에 실행되어, 데이터베이스 백업을 수행합니다.
 *
 * Railway Cron: 0 4 * * * (Asia/Seoul)
 */

import dotenv from 'dotenv';
dotenv.config();

import { BackupService } from '../services/backupService';

async function main() {
  console.log('⏰ [Backup Worker] Starting...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  try {
    await BackupService.performFullBackup();
    console.log('✅ [Backup Worker] Completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Backup Worker] Failed:', error);
    process.exit(1);
  }
}

main();
