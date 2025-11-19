import cron from 'node-cron';
import { ExportJobDatabase } from '../services/exportDatabase';
import { ExportService } from '../services/exportService';
import { PushNotificationService } from '../services/pushNotificationService';

/**
 * Export Job Processor
 *
 * 주기적으로 pending 상태의 export job을 처리합니다.
 * - 매 5분마다 실행
 * - 한 번에 하나씩 순차 처리 (서버 부하 관리)
 */
export class ExportJob {
  private static isProcessing = false;

  /**
   * Export job processor 시작
   */
  static start() {
    // 매 5분마다 실행 (0, 5, 10, 15, ...)
    cron.schedule('*/5 * * * *', async () => {
      await this.processPendingJobs();
    });

    console.log('✅ [ExportJob] Export job processor started (runs every 5 minutes)');

    // 서버 시작 시 한 번 실행
    setTimeout(() => {
      this.processPendingJobs();
    }, 10000); // 10초 후 실행 (서버 초기화 대기)
  }

  /**
   * Process pending export jobs
   */
  private static async processPendingJobs() {
    if (this.isProcessing) {
      console.log('⏭️  [ExportJob] Already processing jobs, skipping this run');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingJobs = await ExportJobDatabase.getPending();

      if (pendingJobs.length === 0) {
        console.log('ℹ️  [ExportJob] No pending export jobs');
        return;
      }

      console.log(`📋 [ExportJob] Found ${pendingJobs.length} pending export job(s)`);

      // Process jobs sequentially to manage server load
      for (const job of pendingJobs) {
        try {
          console.log(`🔄 [ExportJob] Processing job ${job.id} for user ${job.userId}`);
          await ExportService.processExportJob(job.id);

          // Send notifications on completion
          const updatedJob = await ExportJobDatabase.get(job.id);
          if (updatedJob?.status === 'completed') {
            // Send push notification
            await PushNotificationService.sendNotification(
              job.userId,
              '내보내기 준비 완료',
              '일기 다운로드가 준비되었습니다.',
              { type: 'export_ready', jobId: job.id }
            );

            // TODO: Send email with download link
            // await EmailService.sendExportEmail(updatedJob.email, updatedJob.s3Url!, updatedJob.expiresAt!);
            console.log(`📧 [ExportJob] TODO: Send email to ${updatedJob.email} with download link`);
            console.log(`   Download URL: ${updatedJob.s3Url}`);
            console.log(`   Expires: ${updatedJob.expiresAt}`);
          } else if (updatedJob?.status === 'failed') {
            // Send push notification
            await PushNotificationService.sendNotification(
              job.userId,
              '내보내기 실패',
              '일기 데이터 내보내기 중 오류가 발생했습니다. 다시 시도해주세요.',
              { type: 'export_failed', jobId: job.id }
            );

            // TODO: Send failure email
            // await EmailService.sendExportFailureEmail(updatedJob.email, updatedJob.errorMessage);
          }

          // Wait between jobs to reduce server load
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ [ExportJob] Failed to process job ${job.id}:`, error);
          // Continue processing other jobs even if one fails
        }
      }

      console.log(`✅ [ExportJob] Finished processing ${pendingJobs.length} job(s)`);
    } catch (error) {
      console.error('❌ [ExportJob] Error in processPendingJobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cleanup expired exports
   *
   * 매일 03:00 AM에 실행
   */
  static startCleanup() {
    cron.schedule('0 3 * * *', async () => {
      try {
        console.log('🧹 [ExportJob] Starting daily cleanup of expired exports');
        await ExportService.cleanupExpiredExports();
        console.log('✅ [ExportJob] Daily cleanup completed');
      } catch (error) {
        console.error('❌ [ExportJob] Cleanup failed:', error);
      }
    });

    console.log('✅ [ExportJob] Export cleanup job started (runs daily at 03:00 AM)');
  }
}
