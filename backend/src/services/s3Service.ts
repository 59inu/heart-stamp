import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpsAgent } from 'https';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

/**
 * S3 이미지 업로드 서비스
 *
 * 환경변수 필요:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (기본: ap-northeast-2)
 * - S3_BUCKET_NAME
 */

// S3 클라이언트 초기화 (타임아웃 및 연결 설정 추가)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  requestHandler: new NodeHttpHandler({
    requestTimeout: 30000, // 30초 타임아웃
    httpsAgent: new HttpsAgent({
      keepAlive: true, // HTTP keep-alive 활성화 (연결 재사용)
      maxSockets: 50, // 최대 동시 연결 수
    }),
  }),
  maxAttempts: 3, // 최대 3회 재시도
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

export class S3Service {
  /**
   * S3 설정 확인
   */
  static isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET_NAME
    );
  }

  /**
   * 이미지를 S3에 업로드
   *
   * @param buffer 이미지 파일 버퍼
   * @param originalname 원본 파일명
   * @returns S3 URL
   */
  static async uploadImage(buffer: Buffer, originalname: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('S3 configuration is missing');
    }

    // 고유한 파일명 생성: uuid + 원본 확장자
    const ext = path.extname(originalname);
    const key = `images/${uuidv4()}${ext}`;

    // MIME 타입 결정
    const mimeType = this.getMimeType(ext);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // ACL 제거 - 버킷 정책으로 퍼블릭 액세스 관리
    });

    await s3Client.send(command);

    // S3 URL 반환
    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${key}`;
    return imageUrl;
  }

  /**
   * S3에서 이미지 삭제
   *
   * @param imageUrl S3 이미지 URL
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('S3 configuration is missing');
    }

    try {
      // URL에서 Key 추출
      // 예: https://bucket.s3.region.amazonaws.com/images/uuid.jpg
      const url = new URL(imageUrl);
      const key = url.pathname.substring(1); // 앞의 '/' 제거

      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      console.log(`🗑️  S3 image deleted: ${key}`);
    } catch (error) {
      console.error('Error deleting S3 image:', error);
      throw error;
    }
  }

  /**
   * 파일 확장자로 MIME 타입 결정
   */
  private static getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.db': 'application/x-sqlite3',
      '.zip': 'application/zip',
      '.json': 'application/json',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * 백업 파일을 S3에 업로드
   *
   * @param filePath 로컬 파일 경로
   * @param s3Key S3 키 (backups/2025-11-06_diary.db)
   * @returns S3 URL
   */
  static async uploadBackupFile(filePath: string, s3Key: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('S3 configuration is missing');
    }

    try {
      // 파일 읽기
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const mimeType = this.getMimeType(ext);

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await s3Client.send(command);

      const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${s3Key}`;
      console.log(`📤 [S3] Backup uploaded: ${s3Key}`);
      return s3Url;
    } catch (error) {
      console.error(`❌ [S3] Failed to upload backup ${s3Key}:`, error);
      throw error;
    }
  }

  /**
   * S3에서 특정 prefix의 파일 목록 조회
   *
   * @param prefix S3 prefix (backups/)
   * @returns 파일 목록
   */
  static async listFiles(prefix: string): Promise<Array<{ key: string; lastModified: Date; size: number }>> {
    if (!this.isConfigured()) {
      throw new Error('S3 configuration is missing');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
      });

      const response = await s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents.map((item) => ({
        key: item.Key || '',
        lastModified: item.LastModified || new Date(),
        size: item.Size || 0,
      }));
    } catch (error) {
      console.error(`❌ [S3] Failed to list files with prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * S3에서 파일 삭제
   *
   * @param key S3 키
   */
  static async deleteFile(key: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('S3 configuration is missing');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      console.log(`🗑️  [S3] File deleted: ${key}`);
    } catch (error) {
      console.error(`❌ [S3] Failed to delete file ${key}:`, error);
      throw error;
    }
  }

  /**
   * S3에서 오래된 백업 파일 삭제
   *
   * @param prefix S3 prefix (backups/)
   * @param retentionDays 보관 기간 (일)
   */
  static async cleanOldBackups(prefix: string, retentionDays: number): Promise<number> {
    if (!this.isConfigured()) {
      console.log('⚠️  [S3] S3 not configured, skipping S3 backup cleanup');
      return 0;
    }

    try {
      const files = await this.listFiles(prefix);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      for (const file of files) {
        if (file.lastModified < cutoffDate) {
          await this.deleteFile(file.key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️  [S3] Deleted ${deletedCount} old backup file(s) from S3`);
      }

      return deletedCount;
    } catch (error) {
      console.error('❌ [S3] Failed to clean old backups:', error);
      throw error;
    }
  }
}
