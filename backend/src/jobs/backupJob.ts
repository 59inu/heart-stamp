import cron, { ScheduledTask } from 'node-cron';
import { BackupService } from '../services/backupService';

export class BackupJob {
  private job: ScheduledTask | null = null;

  constructor() {
    console.log('📦 [BackupJob] Backup job initialized');
  }

  /**
   * 크론 작업 시작
   * 매일 새벽 4시에 백업 실행 (AI 배치 작업 후)
   */
  start(): void {
    // TZ 환경변수 사용 (기본값: Asia/Seoul)
    const TZ = process.env.TZ || 'Asia/Seoul';

    // 매일 새벽 4시 실행 (cron: '0 4 * * *')
    this.job = cron.schedule('0 4 * * *', async () => {
      console.log('⏰ [BackupJob] Daily backup job triggered');
      try {
        await BackupService.performFullBackup();
      } catch (error) {
        console.error('❌ [BackupJob] Daily backup job failed:', error);
      }
    }, {
      timezone: TZ
    });

    console.log('✅ [BackupJob] Scheduled to run daily at 4:00 AM');
    console.log(`   - Timezone: ${TZ}`);
  }

  /**
   * 크론 작업 중지
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      console.log('🛑 [BackupJob] Backup job stopped');
    }
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
