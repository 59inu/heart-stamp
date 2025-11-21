#!/usr/bin/env ts-node
/**
 * 백업 복구 스크립트
 *
 * JSON 백업 파일에서 데이터를 복원합니다.
 *
 * 사용법:
 *   # S3에서 백업 다운로드
 *   aws s3 cp s3://heart-stamp-diary-images/backups/2025-11-21_diary_backup.json ./backup.json
 *
 *   # 백업 복원 (주의: 기존 데이터 덮어씀!)
 *   npx ts-node scripts/restore-backup.ts ./backup.json
 *
 *   # Railway DB에 복원 (DATABASE_URL 지정)
 *   DATABASE_URL="postgresql://..." npx ts-node scripts/restore-backup.ts ./backup.json
 */

import fs from 'fs';
import { Pool } from 'pg';
import * as readline from 'readline';

interface BackupData {
  [tableName: string]: any[];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  const backupFilePath = process.argv[2];

  if (!backupFilePath) {
    console.error('Usage: npx ts-node scripts/restore-backup.ts <backup_file.json>');
    process.exit(1);
  }

  if (!fs.existsSync(backupFilePath)) {
    console.error(`❌ Backup file not found: ${backupFilePath}`);
    process.exit(1);
  }

  console.log(`📦 Loading backup file: ${backupFilePath}`);

  const backupData: BackupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf-8'));
  const tables = Object.keys(backupData);

  console.log(`\n📋 Backup contains ${tables.length} tables:`);
  for (const table of tables) {
    console.log(`   - ${table}: ${backupData[table].length} rows`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('\n❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log(`\n🗄️  Target database: ${databaseUrl.split('@')[1] || 'localhost'}`);

  // 확인 프롬프트
  console.log('\n⚠️  WARNING: This will DELETE all existing data and restore from backup!');
  const confirm = await question('Are you sure you want to continue? Type "yes" to proceed: ');

  if (confirm !== 'yes') {
    console.log('❌ Restore cancelled');
    rl.close();
    process.exit(0);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('\n🔄 Starting restore...\n');

    // 외래 키 제약 조건 임시 비활성화
    await pool.query('SET session_replication_role = replica');
    console.log('✓ Disabled foreign key constraints');

    // 각 테이블 복원
    for (const table of tables) {
      const rows = backupData[table];

      if (rows.length === 0) {
        console.log(`⏭️  Skipping empty table: ${table}`);
        continue;
      }

      console.log(`📥 Restoring ${table} (${rows.length} rows)...`);

      // 테이블 데이터 삭제
      await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);

      // 데이터 삽입
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map((col) => row[col]);

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.map((col) => `"${col}"`).join(', ');

        const query = `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders})`;

        try {
          await pool.query(query, values);
        } catch (error: any) {
          console.error(`   ❌ Failed to insert row in ${table}:`, error.message);
          // 계속 진행 (일부 실패해도 나머지는 복원)
        }
      }

      console.log(`   ✅ Restored ${rows.length} rows to ${table}`);
    }

    // 외래 키 제약 조건 다시 활성화
    await pool.query('SET session_replication_role = DEFAULT');
    console.log('\n✓ Re-enabled foreign key constraints');

    // 시퀀스 초기화 (AUTO_INCREMENT 컬럼)
    console.log('\n🔄 Resetting sequences...');
    const sequenceQuery = `
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `;
    const sequenceResult = await pool.query(sequenceQuery);

    for (const row of sequenceResult.rows) {
      const sequenceName = row.sequence_name;
      const tableName = sequenceName.replace(/_id_seq$/, '');

      try {
        await pool.query(`
          SELECT setval('${sequenceName}', COALESCE((SELECT MAX(id) FROM "${tableName}"), 1), true)
        `);
        console.log(`   ✓ Reset sequence: ${sequenceName}`);
      } catch (error: any) {
        console.warn(`   ⚠️  Failed to reset ${sequenceName}: ${error.message}`);
      }
    }

    console.log('\n✅ Restore completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Restore failed:', error.message);
    throw error;
  } finally {
    await pool.end();
    rl.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
