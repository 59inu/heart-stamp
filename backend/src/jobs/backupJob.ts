import { BackupService } from '../services/backupService';

export class BackupJob {
  constructor() {
    console.log('📦 [BackupJob] Backup job initialized');
  }

  // Cron job moved to separate worker (Railway Cron)
  // This method is kept for backward compatibility but does nothing now
  start(): void {
    console.log('📦 [BackupJob] Cron job moved to worker');
    console.log('- Manual trigger: POST /api/jobs/trigger-backup');
  }

  /**
   * 수동으로 백업 실행 (테스트/디버깅용)
   */
  async triggerManually(): Promise<void> {
    console.log('🔧 [BackupJob] Manual backup triggered');
    try {
      await BackupService.performFullBackup();
    } catch (error) {
      console.error('❌ [BackupJob] Manual backup failed:', error);
      throw error;
    }
  }
}
