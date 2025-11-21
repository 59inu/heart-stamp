#!/usr/bin/env ts-node
/**
 * 수동 백업 스크립트
 *
 * 긴급 상황이나 마이그레이션 전에 즉시 백업을 수행합니다.
 *
 * 사용법:
 *   # 로컬 DB 백업
 *   npm run backup
 *
 *   # Railway 프로덕션 DB 백업
 *   railway run npm run backup
 *
 *   # 특정 DATABASE_URL 백업
 *   DATABASE_URL="postgresql://..." npm run backup
 */

import dotenv from 'dotenv';
dotenv.config();

import { BackupService } from '../src/services/backupService';

async function main() {
  console.log('🚀 Manual backup started...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log(`🗄️  Database: ${databaseUrl.split('@')[1] || 'localhost'}`);
  console.log(`📍 Environment: ${process.env.RAILWAY_ENVIRONMENT || 'local'}\n`);

  try {
    await BackupService.performFullBackup();

    console.log('\n✅ Manual backup completed successfully!');

    // S3에 업로드된 파일 목록 표시
    if (process.env.AWS_ACCESS_KEY_ID) {
      console.log('\n📤 Backup uploaded to S3:');
      console.log(`   Bucket: ${process.env.S3_BUCKET_NAME}`);
      console.log(`   Prefix: backups/`);
      console.log(`\n   To download:`);
      console.log(`   aws s3 cp s3://${process.env.S3_BUCKET_NAME}/backups/$(date +%Y-%m-%d)_diary_backup.json ./backup.json`);
    }
  } catch (error: any) {
    console.error('\n❌ Manual backup failed:', error.message);
    process.exit(1);
  }
}

main();
