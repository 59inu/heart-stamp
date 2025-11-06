import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * S3 이미지 업로드 서비스
 *
 * 환경변수 필요:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (기본: ap-northeast-2)
 * - S3_BUCKET_NAME
 */

// S3 클라이언트 초기화
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
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
      // 퍼블릭 읽기 권한 (버킷 정책으로 설정하는 것을 권장)
      // ACL: 'public-read', // 최신 AWS는 ACL 대신 버킷 정책 사용 권장
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
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}
