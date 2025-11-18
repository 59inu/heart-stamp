import { apiService } from './apiService';
import { logger } from '../utils/logger';

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'txt' | 'pdf';
  email: string;
  s3Url?: string;
  expiresAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Export Service
 *
 * 일기 데이터 내보내기 관련 기능
 */
export class ExportService {
  /**
   * Request data export
   */
  static async requestExport(format: 'txt' | 'pdf' = 'txt'): Promise<{ jobId: string }> {
    try {
      logger.log(`📤 [ExportService] Requesting ${format} export...`);

      const response = await apiService.requestExport(format);

      if (!response.jobId) {
        throw new Error('No jobId in response');
      }

      logger.log(`✅ [ExportService] Export requested successfully: ${response.jobId}`);
      return { jobId: response.jobId };
    } catch (error: any) {
      logger.error('❌ [ExportService] Failed to request export:', error);

      // Handle specific error messages
      if (error.message?.includes('이미 진행 중인')) {
        throw new Error('이미 진행 중인 내보내기 요청이 있습니다');
      }

      throw new Error(error.message || '내보내기 요청에 실패했습니다');
    }
  }

  /**
   * Check if user has active export job
   */
  static async hasActiveExportJob(): Promise<boolean> {
    try {
      const jobs = await this.getAllExportJobs();
      return jobs.some(job => job.status === 'pending' || job.status === 'processing');
    } catch (error) {
      logger.error('❌ [ExportService] Failed to check active jobs:', error);
      return false;
    }
  }

  /**
   * Get export job status
   */
  static async getExportStatus(jobId: string): Promise<ExportJob> {
    try {
      logger.log(`🔍 [ExportService] Getting export status for job ${jobId}...`);

      const response = await apiService.getExportStatus(jobId);

      logger.log(`✅ [ExportService] Export status: ${response.status}`);
      return response as ExportJob;
    } catch (error: any) {
      logger.error('❌ [ExportService] Failed to get export status:', error);
      throw new Error(error.message || '내보내기 상태 조회에 실패했습니다');
    }
  }

  /**
   * Get all export jobs for user
   */
  static async getAllExportJobs(): Promise<ExportJob[]> {
    try {
      logger.log('📋 [ExportService] Getting all export jobs...');

      const response = await apiService.getAllExportJobs();

      logger.log(`✅ [ExportService] Found ${response.jobs?.length || 0} export jobs`);
      return response.jobs || [];
    } catch (error: any) {
      logger.error('❌ [ExportService] Failed to get export jobs:', error);
      throw new Error(error.message || '내보내기 목록 조회에 실패했습니다');
    }
  }

  /**
   * Delete all user data
   */
  static async deleteAllData(): Promise<{ deletedDiaries: number; deletedJobs: number }> {
    try {
      logger.log('🗑️  [ExportService] Deleting all user data...');

      const response = await apiService.deleteAllData();

      logger.log(
        `✅ [ExportService] Deleted ${response.deletedDiaries} diaries, ${response.deletedJobs} export jobs`
      );

      return {
        deletedDiaries: response.deletedDiaries || 0,
        deletedJobs: response.deletedJobs || 0,
      };
    } catch (error: any) {
      logger.error('❌ [ExportService] Failed to delete all data:', error);
      throw new Error(error.message || '데이터 삭제에 실패했습니다');
    }
  }
}
