import { BackupService } from '../services/backupService';

export class BackupJob {
  /**
   * 수동으로 백업 실행 (관리 API용)
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
