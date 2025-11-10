import * as FileSystem from 'expo-file-system';
import { apiService } from './apiService';
import { SyncQueue } from './syncQueue';
import { logger } from '../utils/logger';

const CACHE_DIR = `${FileSystem.documentDirectory}images/`;

export class ImageCache {
  /**
   * 캐시 디렉토리 초기화
   */
  private static async ensureCacheDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        logger.log('📁 [ImageCache] Cache directory created');
      }
    } catch (error) {
      logger.error('[ImageCache] Error creating cache directory:', error);
      throw error;
    }
  }

  /**
   * 이미지를 로컬에 영구 저장
   * @param uri 원본 이미지 URI (file:// 또는 content://)
   * @returns 로컬 캐시 경로
   */
  static async saveLocal(uri: string): Promise<string> {
    try {
      await this.ensureCacheDirectory();

      const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const localPath = `${CACHE_DIR}${filename}`;

      logger.log(`💾 [ImageCache] Saving image locally: ${uri} → ${localPath}`);

      // 파일 복사
      await FileSystem.copyAsync({
        from: uri,
        to: localPath,
      });

      logger.log(`✅ [ImageCache] Image saved locally: ${localPath}`);
      return localPath;
    } catch (error) {
      logger.error('[ImageCache] Error saving image locally:', error);
      throw error;
    }
  }

  /**
   * 로컬 이미지를 S3에 업로드하고 URL 반환
   * @param localUri 로컬 파일 경로
   * @returns S3 URL (성공) 또는 로컬 경로 (실패)
   */
  static async uploadToServer(localUri: string): Promise<string> {
    try {
      logger.log(`📤 [ImageCache] Uploading image to server: ${localUri}`);

      const result = await apiService.uploadImage(localUri);

      if (result.success) {
        logger.log(`✅ [ImageCache] Image uploaded successfully: ${result.data}`);
        return result.data; // S3 URL
      } else {
        logger.error(`❌ [ImageCache] Image upload failed: ${result.error}`);
        // 실패 시 로컬 경로 유지
        return localUri;
      }
    } catch (error) {
      logger.error('[ImageCache] Error uploading image:', error);
      // 에러 발생 시에도 로컬 경로 반환
      return localUri;
    }
  }

  /**
   * 이미지를 로컬에 저장한 후 백그라운드에서 S3 업로드 시도
   * @param uri 원본 이미지 URI
   * @param onUploadComplete 업로드 완료 시 콜백 (S3 URL 전달)
   * @returns 로컬 경로 (즉시 반환)
   */
  static async saveAndUpload(
    uri: string,
    onUploadComplete?: (serverUrl: string) => void
  ): Promise<string> {
    try {
      // 1. 먼저 로컬에 저장 (항상 성공)
      const localUri = await this.saveLocal(uri);

      // 2. 백그라운드에서 S3 업로드 시도 (Promise를 기다리지 않음)
      this.uploadToServer(localUri)
        .then((serverUrl) => {
          if (serverUrl !== localUri) {
            // 업로드 성공 시 콜백 호출
            logger.log(`✅ [ImageCache] Upload complete, server URL: ${serverUrl}`);
            onUploadComplete?.(serverUrl);
          } else {
            // 업로드 실패 시 큐에 추가
            logger.log(`⏳ [ImageCache] Upload failed, adding to queue`);
            SyncQueue.add('upload_image', { uri: localUri });
          }
        })
        .catch((error) => {
          logger.error('[ImageCache] Background upload error:', error);
          // 에러 발생 시 큐에 추가
          SyncQueue.add('upload_image', { uri: localUri });
        });

      // 3. 로컬 경로 즉시 반환
      return localUri;
    } catch (error) {
      logger.error('[ImageCache] Error in saveAndUpload:', error);
      throw error;
    }
  }

  /**
   * 로컬 경로인지 확인
   */
  static isLocalUri(uri: string): boolean {
    return uri.startsWith('file://') || uri.startsWith(CACHE_DIR);
  }

  /**
   * 서버 URL인지 확인
   */
  static isServerUri(uri: string): boolean {
    return uri.startsWith('http://') || uri.startsWith('https://');
  }

  /**
   * 로컬 캐시 파일 삭제
   */
  static async deleteLocal(uri: string): Promise<boolean> {
    try {
      if (!this.isLocalUri(uri)) {
        logger.log(`ℹ️ [ImageCache] Not a local URI, skipping delete: ${uri}`);
        return false;
      }

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
        logger.log(`🗑️ [ImageCache] Deleted local image: ${uri}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('[ImageCache] Error deleting local image:', error);
      return false;
    }
  }

  /**
   * 캐시 정리 - 오래된 이미지 삭제
   * @param daysOld 몇 일 이상 된 파일 삭제 (기본 30일)
   */
  static async cleanupOldCache(daysOld: number = 30): Promise<number> {
    try {
      await this.ensureCacheDirectory();

      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const filename of files) {
        const filePath = `${CACHE_DIR}${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.modificationTime) {
          const age = now - fileInfo.modificationTime * 1000;

          if (age > maxAge) {
            await FileSystem.deleteAsync(filePath);
            deletedCount++;
            logger.log(`🗑️ [ImageCache] Deleted old image: ${filename}`);
          }
        }
      }

      logger.log(`✅ [ImageCache] Cleanup complete: ${deletedCount} files deleted`);
      return deletedCount;
    } catch (error) {
      logger.error('[ImageCache] Error cleaning up cache:', error);
      return 0;
    }
  }

  /**
   * 캐시 크기 조회
   */
  static async getCacheSize(): Promise<number> {
    try {
      await this.ensureCacheDirectory();

      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      let totalSize = 0;

      for (const filename of files) {
        const filePath = `${CACHE_DIR}${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }

      logger.log(`📊 [ImageCache] Cache size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      return totalSize;
    } catch (error) {
      logger.error('[ImageCache] Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * 전체 캐시 삭제
   */
  static async clearAll(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        logger.log('🗑️ [ImageCache] All cache cleared');
      }
    } catch (error) {
      logger.error('[ImageCache] Error clearing cache:', error);
    }
  }
}
