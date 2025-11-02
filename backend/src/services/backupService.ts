import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import Database from 'better-sqlite3';

const BACKUP_DIR = path.join(__dirname, '../../backups');
const DB_PATH = path.join(__dirname, '../../diary.db');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const RETENTION_DAYS = 7; // 7일치 백업 보관

export class BackupService {
  /**
   * 백업 디렉토리 초기화
   */
  private static ensureBackupDir(): void {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('✅ [Backup] Created backup directory');
    }
  }

  /**
   * SQLite 데이터베이스 백업 (VACUUM INTO 사용)
   */
  private static async performDatabaseBackup(timestamp: string): Promise<{ path: string; size: number }> {
    try {
      const backupPath = path.join(BACKUP_DIR, `${timestamp}_diary.db`);

      console.log('📦 [Backup] Starting database backup...');

      // VACUUM INTO: 원자적 백업 + WAL 통합 + 압축
      const db = new Database(DB_PATH, { readonly: true });
      db.exec(`VACUUM INTO '${backupPath}'`);
      db.close();

      const stats = fs.statSync(backupPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      console.log(`✅ [Backup] Database backup created: ${sizeMB}MB`);

      return { path: backupPath, size: stats.size };
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
   * 백업 메타데이터 저장
   */
  private static saveBackupMetadata(
    timestamp: string,
    dbSize: number,
    uploadsSize: number,
    success: boolean,
    duration: number,
    error?: string
  ): void {
    try {
      const metadata = {
        timestamp,
        db_size_bytes: dbSize,
        db_size_mb: (dbSize / 1024 / 1024).toFixed(2),
        uploads_size_bytes: uploadsSize,
        uploads_size_mb: (uploadsSize / 1024 / 1024).toFixed(2),
        total_size_mb: ((dbSize + uploadsSize) / 1024 / 1024).toFixed(2),
        success,
        duration_seconds: duration.toFixed(2),
        error: error || null,
      };

      const metadataPath = path.join(BACKUP_DIR, `${timestamp}_metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('❌ [Backup] Failed to save metadata:', error);
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

      // 오래된 백업 정리
      this.cleanOldBackups();

      const duration = (Date.now() - startTime) / 1000;

      // 메타데이터 저장
      this.saveBackupMetadata(
        timestamp,
        dbBackup.size,
        uploadsBackup.size,
        true,
        duration
      );

      console.log(`✅ [Backup] Daily backup completed successfully in ${duration.toFixed(2)}s\n`);
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // 실패 메타데이터 저장
      this.saveBackupMetadata(timestamp, 0, 0, false, duration, errorMessage);

      console.error(`❌ [Backup] Daily backup failed after ${duration.toFixed(2)}s:`, error);
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
