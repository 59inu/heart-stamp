import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import { DiaryDatabase } from './database';
import { S3Service } from './s3Service';
import { ExportJobDatabase } from './exportDatabase';
import { ExportFormat } from '../types/export';
import { format } from 'date-fns';

/**
 * Export Service - Generates export files from diary entries
 */
export class ExportService {
  private static readonly EXPORT_RETENTION_DAYS = 14;

  /**
   * Process export job
   */
  static async processExportJob(jobId: string): Promise<void> {
    console.log(`🚀 [ExportService] Starting export job ${jobId}`);

    const job = ExportJobDatabase.get(jobId);
    if (!job) {
      console.error(`❌ [ExportService] Job ${jobId} not found`);
      return;
    }

    if (job.status !== 'pending') {
      console.log(`⏭️  [ExportService] Job ${jobId} is not pending (status: ${job.status}), skipping`);
      return;
    }

    // Update status to processing
    ExportJobDatabase.updateStatus(jobId, 'processing');

    try {
      // Get all diary entries for user
      const diaries = await DiaryDatabase.getAllByUserId(job.userId);

      if (diaries.length === 0) {
        throw new Error('일기 데이터가 없습니다');
      }

      // Generate export file based on format
      let filePath: string;
      if (job.format === 'txt') {
        filePath = await this.generateTextExport(job.userId, diaries);
      } else if (job.format === 'pdf') {
        // TODO: Implement PDF export for premium users
        throw new Error('PDF export is not yet implemented');
      } else {
        throw new Error(`Unsupported export format: ${job.format}`);
      }

      // Create zip file
      const zipPath = await this.createZipFile(filePath);

      // Upload to S3
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.EXPORT_RETENTION_DAYS);

      const s3Key = `exports/${job.userId}/${uuidv4()}.zip`;
      const s3Url = await S3Service.uploadBackupFile(zipPath, s3Key);

      // Update job status to completed
      ExportJobDatabase.updateStatus(jobId, 'completed', {
        s3Url,
        expiresAt: expiresAt.toISOString(),
      });

      // Clean up temporary files
      fs.unlinkSync(filePath);
      fs.unlinkSync(zipPath);

      console.log(`✅ [ExportService] Export job ${jobId} completed successfully`);
    } catch (error: any) {
      console.error(`❌ [ExportService] Export job ${jobId} failed:`, error);

      ExportJobDatabase.updateStatus(jobId, 'failed', {
        errorMessage: error.message || 'Unknown error',
      });
    }
  }

  /**
   * Generate text export
   */
  private static async generateTextExport(userId: string, diaries: any[]): Promise<string> {
    const tmpDir = path.join(__dirname, '../../uploads');

    // Ensure tmp directory exists
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const filename = `heartstamp_diary_${userId}_${Date.now()}.txt`;
    const filePath = path.join(tmpDir, filename);

    let content = '='.repeat(60) + '\n';
    content += '하트스탬프 일기 데이터 내보내기\n';
    content += '='.repeat(60) + '\n\n';
    content += `생성일: ${format(new Date(), 'yyyy년 MM월 dd일 HH:mm')}\n`;
    content += `총 일기 수: ${diaries.length}개\n\n`;
    content += '='.repeat(60) + '\n\n';

    // Sort diaries by date (newest first)
    const sortedDiaries = [...diaries].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    for (const diary of sortedDiaries) {
      content += `날짜: ${format(new Date(diary.date), 'yyyy년 MM월 dd일 (E)')}\n`;

      if (diary.weather) {
        content += `날씨: ${this.getWeatherEmoji(diary.weather)} ${diary.weather}\n`;
      }

      if (diary.mood) {
        content += `기분: ${diary.mood}\n`;
      }

      if (diary.moodTag) {
        content += `무드 태그: ${diary.moodTag}\n`;
      }

      content += '\n';
      content += '내용:\n';
      content += diary.content + '\n';
      content += '\n';

      if (diary.aiComment) {
        content += '선생님 코멘트:\n';
        content += diary.aiComment + '\n';
        content += '\n';
      }

      if (diary.stampType) {
        content += `도장: ${this.getStampEmoji(diary.stampType)}\n`;
        content += '\n';
      }

      content += '-'.repeat(60) + '\n\n';
    }

    content += '='.repeat(60) + '\n';
    content += '하트스탬프와 함께한 모든 순간을 응원합니다 ❤️\n';
    content += '='.repeat(60) + '\n';

    fs.writeFileSync(filePath, content, 'utf-8');

    console.log(`📝 [ExportService] Generated text export: ${filePath}`);
    return filePath;
  }

  /**
   * Create zip file from export file
   */
  private static async createZipFile(filePath: string): Promise<string> {
    const zipPath = filePath.replace(/\.\w+$/, '.zip');

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`📦 [ExportService] Created zip file: ${zipPath} (${archive.pointer()} bytes)`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.file(filePath, { name: path.basename(filePath) });
      archive.finalize();
    });
  }

  /**
   * Get weather emoji
   */
  private static getWeatherEmoji(weather: string): string {
    const emojiMap: Record<string, string> = {
      '맑음': '☀️',
      '흐림': '☁️',
      '비': '🌧️',
      '눈': '❄️',
    };
    return emojiMap[weather] || '';
  }

  /**
   * Get stamp emoji
   */
  private static getStampEmoji(stampType: string): string {
    const emojiMap: Record<string, string> = {
      great: '🌟',
      good: '👍',
      normal: '😊',
      hard: '💪',
    };
    return emojiMap[stampType] || '❤️';
  }

  /**
   * Clean up expired S3 export files
   */
  static async cleanupExpiredExports(): Promise<number> {
    console.log('🧹 [ExportService] Starting cleanup of expired exports');

    try {
      // Delete expired job records from database
      const deletedJobsCount = ExportJobDatabase.deleteExpired();

      // Clean up S3 files older than retention period
      const deletedS3Count = await S3Service.cleanOldBackups(
        'exports/',
        this.EXPORT_RETENTION_DAYS
      );

      console.log(
        `✅ [ExportService] Cleanup completed: ${deletedJobsCount} job records, ${deletedS3Count} S3 files`
      );

      return deletedJobsCount + deletedS3Count;
    } catch (error) {
      console.error('❌ [ExportService] Cleanup failed:', error);
      throw error;
    }
  }
}
