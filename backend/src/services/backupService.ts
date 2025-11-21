import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { S3Service } from './s3Service';
import { Pool } from 'pg';

const BACKUP_DIR = path.join(__dirname, '../../backups');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const RETENTION_DAYS = 7; // 7일치 백업 보관

// Railway 환경 감지
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT !== undefined;

export class BackupService {
  /**
   * 백업 디렉토리 초기화 (로컬 환경에만 사용)
   */
  private static ensureBackupDir(): void {
    // Railway는 ephemeral filesystem이므로 로컬 저장 불필요
    if (IS_RAILWAY) {
      console.log('⚠️  [Backup] Railway environment detected - skipping local backup dir');
      return;
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('✅ [Backup] Created backup directory');
    }
  }

  /**
   * PostgreSQL 데이터베이스 백업 (pg 라이브러리 사용 - pg_dump 불필요)
   */
  private static async performDatabaseBackup(timestamp: string): Promise<{ path: string; size: number }> {
    try {
      console.log('📦 [Backup] Starting database backup...');

      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      // pg 라이브러리로 데이터 추출
      const pool = new Pool({ connectionString: databaseUrl });

      try {
        // 모든 테이블 조회
        const tablesResult = await pool.query(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
        `);

        const tables = tablesResult.rows.map(row => row.tablename);
        console.log(`📋 [Backup] Found ${tables.length} tables: ${tables.join(', ')}`);

        // 각 테이블 데이터 추출
        const backupData: Record<string, any[]> = {};
        for (const table of tables) {
          const result = await pool.query(`SELECT * FROM "${table}"`);
          backupData[table] = result.rows;
          console.log(`   ✓ ${table}: ${result.rows.length} rows`);
        }

        // JSON 파일로 저장
        const backupJson = JSON.stringify(backupData, null, 2);

        // Railway 환경: 임시 파일로만 생성 (S3 업로드 후 삭제 예정)
        // 로컬 환경: backups/ 디렉토리에 영구 저장
        const backupPath = IS_RAILWAY
          ? path.join('/tmp', `${timestamp}_diary_backup.json`)
          : path.join(BACKUP_DIR, `${timestamp}_diary_backup.json`);

        fs.writeFileSync(backupPath, backupJson);

        const stats = fs.statSync(backupPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log(`✅ [Backup] Database backup created: ${sizeMB}MB (${IS_RAILWAY ? 'temp' : 'local'})`);

        return { path: backupPath, size: stats.size };
      } finally {
        await pool.end();
      }
    } catch (error) {
      console.error('❌ [Backup] Database backup failed:', error);
      throw error;
    }
  }

  /**
   * uploads 폴더 백업 (ZIP 압축)
   */
  private static async performUploadsBackup(timestamp: string): Promise<{ path: string; size: number }> {
    return new Promise((resolve, reject) => {
      try {
        const backupPath = path.join(BACKUP_DIR, `${timestamp}_uploads.zip`);

        // uploads 폴더가 없으면 스킵
        if (!fs.existsSync(UPLOADS_DIR)) {
          console.log('⚠️  [Backup] No uploads directory found, skipping...');
          return resolve({ path: '', size: 0 });
        }

        // uploads 폴더가 비어있으면 스킵
        const files = fs.readdirSync(UPLOADS_DIR);
        if (files.length === 0) {
          console.log('⚠️  [Backup] Uploads directory is empty, skipping...');
          return resolve({ path: '', size: 0 });
        }

        console.log('📦 [Backup] Starting uploads backup...');

        const output = fs.createWriteStream(backupPath);
        const archive = archiver('zip', { zlib: { level: 9 } }); // 최대 압축

        output.on('close', () => {
          const stats = fs.statSync(backupPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`✅ [Backup] Uploads backup created: ${sizeMB}MB`);
          resolve({ path: backupPath, size: stats.size });
        });

        archive.on('error', (err) => {
          console.error('❌ [Backup] Uploads backup failed:', err);
          reject(err);
        });

        archive.pipe(output);
        archive.directory(UPLOADS_DIR, false); // uploads/ 폴더 내용 압축
        archive.finalize();
      } catch (error) {
        console.error('❌ [Backup] Uploads backup failed:', error);
        reject(error);
      }
    });
  }

  /**
   * 오래된 백업 파일 삭제 (RETENTION_DAYS보다 오래된 파일)
   */
  private static cleanOldBackups(): void {
    try {
      if (!fs.existsSync(BACKUP_DIR)) return;

      const now = Date.now();
      const cutoffTime = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(BACKUP_DIR);

      let deletedCount = 0;

      files.forEach((file) => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);

        // JSON 메타데이터 파일과 백업 파일 모두 삭제
        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        console.log(`🗑️  [Backup] Deleted ${deletedCount} old backup file(s)`);
      }
    } catch (error) {
      console.error('❌ [Backup] Failed to clean old backups:', error);
    }
  }


  /**
   * S3에 백업 파일 업로드
   */
  private static async uploadToS3(filePath: string, filename: string): Promise<void> {
    if (!S3Service.isConfigured()) {
      console.log('⚠️  [Backup] S3 not configured, skipping S3 upload');
      return;
    }

    try {
      const s3Key = `backups/${filename}`;
      await S3Service.uploadBackupFile(filePath, s3Key);
    } catch (error) {
      console.error(`❌ [Backup] Failed to upload ${filename} to S3:`, error);
      // S3 업로드 실패해도 로컬 백업은 유지되므로 에러 던지지 않음
    }
  }

  /**
   * 전체 백업 수행 (메인 함수)
   */
  static async performFullBackup(): Promise<void> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().split('T')[0]; // 2025-11-03

    console.log(`\n🔄 [Backup] Starting daily backup at ${new Date().toISOString()}`);

    try {
      // 백업 디렉토리 생성
      this.ensureBackupDir();

      // 데이터베이스 백업
      const dbBackup = await this.performDatabaseBackup(timestamp);

      // 이미지 폴더 백업
      const uploadsBackup = await this.performUploadsBackup(timestamp);

      // S3에 백업 업로드
      if (S3Service.isConfigured()) {
        console.log('📤 [Backup] Uploading backups to S3...');

        // DB 백업 업로드
        if (dbBackup.path) {
          await this.uploadToS3(dbBackup.path, path.basename(dbBackup.path));
          // Railway 환경: 임시 파일 삭제
          if (IS_RAILWAY && fs.existsSync(dbBackup.path)) {
            fs.unlinkSync(dbBackup.path);
            console.log('🗑️  [Backup] Cleaned up temp DB backup file');
          }
        }

        // uploads 백업 업로드
        if (uploadsBackup.path) {
          await this.uploadToS3(uploadsBackup.path, path.basename(uploadsBackup.path));
          // Railway 환경: 임시 파일 삭제
          if (IS_RAILWAY && fs.existsSync(uploadsBackup.path)) {
            fs.unlinkSync(uploadsBackup.path);
            console.log('🗑️  [Backup] Cleaned up temp uploads backup file');
          }
        }

        // 메타데이터 생성 및 업로드
        const metadata = {
          timestamp,
          db_size_bytes: dbBackup.size,
          db_size_mb: (dbBackup.size / 1024 / 1024).toFixed(2),
          uploads_size_bytes: uploadsBackup.size,
          uploads_size_mb: (uploadsBackup.size / 1024 / 1024).toFixed(2),
          total_size_mb: ((dbBackup.size + uploadsBackup.size) / 1024 / 1024).toFixed(2),
          success: true,
          duration_seconds: ((Date.now() - startTime) / 1000).toFixed(2),
          environment: IS_RAILWAY ? 'railway' : 'local',
        };

        const metadataPath = IS_RAILWAY
          ? path.join('/tmp', `${timestamp}_metadata.json`)
          : path.join(BACKUP_DIR, `${timestamp}_metadata.json`);

        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        await this.uploadToS3(metadataPath, `${timestamp}_metadata.json`);

        // Railway 환경: 메타데이터 임시 파일 삭제
        if (IS_RAILWAY && fs.existsSync(metadataPath)) {
          fs.unlinkSync(metadataPath);
          console.log('🗑️  [Backup] Cleaned up temp metadata file');
        }

        // S3 오래된 백업 정리
        await S3Service.cleanOldBackups('backups/', RETENTION_DAYS);
      } else {
        console.warn('⚠️  [Backup] S3 not configured - backups stored locally only (NOT recommended for Railway!)');
      }

      // 로컬 오래된 백업 정리 (로컬 환경에만 필요)
      if (!IS_RAILWAY) {
        this.cleanOldBackups();
      }

      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ [Backup] Daily backup completed successfully in ${duration.toFixed(2)}s\n`);
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ [Backup] Daily backup failed after ${duration.toFixed(2)}s:`, error);

      // 실패 메타데이터를 S3에 업로드
      if (S3Service.isConfigured()) {
        try {
          const failureMetadata = {
            timestamp,
            db_size_bytes: 0,
            db_size_mb: '0.00',
            uploads_size_bytes: 0,
            uploads_size_mb: '0.00',
            total_size_mb: '0.00',
            success: false,
            duration_seconds: duration.toFixed(2),
            error: errorMessage,
            environment: IS_RAILWAY ? 'railway' : 'local',
          };

          const metadataPath = IS_RAILWAY
            ? path.join('/tmp', `${timestamp}_metadata.json`)
            : path.join(BACKUP_DIR, `${timestamp}_metadata.json`);

          fs.writeFileSync(metadataPath, JSON.stringify(failureMetadata, null, 2));
          await this.uploadToS3(metadataPath, `${timestamp}_metadata.json`);

          if (IS_RAILWAY && fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
          }
        } catch (metaError) {
          console.error('❌ [Backup] Failed to upload failure metadata:', metaError);
        }
      }

      throw error;
    }
  }

  /**
   * 백업 목록 조회 (관리용)
   */
  static listBackups(): Array<{ date: string; files: string[]; metadata?: any }> {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        return [];
      }

      const files = fs.readdirSync(BACKUP_DIR);
      const backupsByDate: Record<string, string[]> = {};

      // 날짜별로 그룹화
      files.forEach((file) => {
        const match = file.match(/^(\d{4}-\d{2}-\d{2})_/);
        if (match) {
          const date = match[1];
          if (!backupsByDate[date]) {
            backupsByDate[date] = [];
          }
          backupsByDate[date].push(file);
        }
      });

      // 배열로 변환 및 메타데이터 추가
      return Object.entries(backupsByDate)
        .map(([date, fileList]) => {
          const metadataFile = fileList.find((f) => f.endsWith('_metadata.json'));
          let metadata = null;

          if (metadataFile) {
            const metadataPath = path.join(BACKUP_DIR, metadataFile);
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          }

          return { date, files: fileList, metadata };
        })
        .sort((a, b) => b.date.localeCompare(a.date)); // 최신순 정렬
    } catch (error) {
      console.error('❌ [Backup] Failed to list backups:', error);
      return [];
    }
  }
}
