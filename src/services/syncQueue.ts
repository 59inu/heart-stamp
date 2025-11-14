import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from './apiService';
import { DiaryStorage } from './diaryStorage';
import { logger } from '../utils/logger';
import { DiaryEntry } from '../models/DiaryEntry';

const QUEUE_KEY = '@stamp_diary:sync_queue';
const FAILED_QUEUE_KEY = '@stamp_diary:failed_queue';
const MAX_ATTEMPTS = 3;

export interface QueuedOperation {
  id: string;
  type: 'upload_diary' | 'upload_image' | 'delete_diary';
  data: any;
  attempts: number;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
}

export class SyncQueue {
  private static processing = false;
  private static isWatching = false;

  /**
   * 큐에 작업 추가
   */
  static async add(
    type: QueuedOperation['type'],
    data: any
  ): Promise<void> {
    try {
      const queue = await this.getQueue();
      const operation: QueuedOperation = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        attempts: 0,
        createdAt: new Date().toISOString(),
      };

      queue.push(operation);
      await this.saveQueue(queue);
      logger.log(`📥 [SyncQueue] Added operation ${operation.id} (${type})`);

      // 즉시 처리 시도
      this.processQueue();
    } catch (error) {
      logger.error('[SyncQueue] Error adding to queue:', error);
    }
  }

  /**
   * 큐에서 작업 가져오기
   */
  private static async getQueue(): Promise<QueuedOperation[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('[SyncQueue] Error getting queue:', error);
      return [];
    }
  }

  /**
   * 큐 저장
   */
  private static async saveQueue(queue: QueuedOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      logger.error('[SyncQueue] Error saving queue:', error);
    }
  }

  /**
   * 실패한 작업 목록 가져오기
   */
  static async getFailedQueue(): Promise<QueuedOperation[]> {
    try {
      const data = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('[SyncQueue] Error getting failed queue:', error);
      return [];
    }
  }

  /**
   * 실패한 작업 저장
   */
  private static async saveFailedQueue(queue: QueuedOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      logger.error('[SyncQueue] Error saving failed queue:', error);
    }
  }

  /**
   * 작업을 실패 큐로 이동
   */
  private static async moveToFailed(operation: QueuedOperation): Promise<void> {
    try {
      const failedQueue = await this.getFailedQueue();
      failedQueue.push(operation);
      await this.saveFailedQueue(failedQueue);
      logger.log(`❌ [SyncQueue] Moved operation ${operation.id} to failed queue`);
    } catch (error) {
      logger.error('[SyncQueue] Error moving to failed queue:', error);
    }
  }

  /**
   * 큐에서 작업 제거
   */
  private static async removeFromQueue(operationId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter((op) => op.id !== operationId);
      await this.saveQueue(filteredQueue);
      logger.log(`✅ [SyncQueue] Removed operation ${operationId} from queue`);
    } catch (error) {
      logger.error('[SyncQueue] Error removing from queue:', error);
    }
  }

  /**
   * 단일 작업 처리
   */
  private static async processOperation(operation: QueuedOperation): Promise<boolean> {
    try {
      logger.log(`🔄 [SyncQueue] Processing operation ${operation.id} (${operation.type}, attempt ${operation.attempts + 1})`);

      switch (operation.type) {
        case 'upload_diary': {
          const diary = operation.data as DiaryEntry;
          const result = await apiService.uploadDiary(diary);

          if (result.success) {
            // 성공 시 로컬 동기화 플래그 업데이트
            await DiaryStorage.update(diary._id, { syncedWithServer: true });
            logger.log(`✅ [SyncQueue] Diary ${diary._id} uploaded successfully`);
            return true;
          }

          logger.error(`❌ [SyncQueue] Diary upload failed:`, result.error);
          operation.error = result.error;
          return false;
        }

        case 'delete_diary': {
          const diaryId = operation.data.diaryId as string;
          const result = await apiService.deleteDiary(diaryId);

          if (result.success) {
            logger.log(`✅ [SyncQueue] Diary ${diaryId} deleted successfully`);
            return true;
          }

          logger.error(`❌ [SyncQueue] Diary deletion failed:`, result.error);
          operation.error = result.error;
          return false;
        }

        case 'upload_image': {
          const { uri } = operation.data;
          const result = await apiService.uploadImage(uri);

          if (result.success) {
            logger.log(`✅ [SyncQueue] Image uploaded successfully: ${result.data}`);
            // 이미지 URL을 반환하는 방법이 필요하면 여기서 처리
            return true;
          }

          logger.error(`❌ [SyncQueue] Image upload failed:`, result.error);
          operation.error = result.error;
          return false;
        }

        default:
          logger.error(`[SyncQueue] Unknown operation type: ${operation.type}`);
          return false;
      }
    } catch (error: any) {
      logger.error(`[SyncQueue] Error processing operation ${operation.id}:`, error);
      operation.error = error.message || 'Unknown error';
      return false;
    }
  }

  /**
   * 큐 처리 (메인 함수)
   */
  static async processQueue(): Promise<void> {
    // 이미 처리 중이면 스킵
    if (this.processing) {
      logger.log('⏭️ [SyncQueue] Already processing, skipping...');
      return;
    }

    // 네트워크 확인
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      logger.log('⏸️ [SyncQueue] Offline, queue processing paused');
      return;
    }

    this.processing = true;
    logger.log('🔄 [SyncQueue] Starting queue processing...');

    try {
      const queue = await this.getQueue();

      if (queue.length === 0) {
        logger.log('✅ [SyncQueue] Queue is empty');
        return;
      }

      logger.log(`📋 [SyncQueue] Processing ${queue.length} operations...`);

      const remainingQueue: QueuedOperation[] = [];

      for (const operation of queue) {
        operation.attempts++;
        operation.lastAttempt = new Date().toISOString();

        const success = await this.processOperation(operation);

        if (success) {
          // 성공 시 큐에서 제거 (remainingQueue에 추가하지 않음)
          await this.removeFromQueue(operation.id);
        } else {
          // 실패 시 재시도 횟수 확인
          if (operation.attempts >= MAX_ATTEMPTS) {
            logger.log(`❌ [SyncQueue] Operation ${operation.id} failed after ${MAX_ATTEMPTS} attempts`);
            await this.moveToFailed(operation);
          } else {
            // 아직 재시도 가능
            logger.log(`⚠️ [SyncQueue] Operation ${operation.id} failed, will retry (${operation.attempts}/${MAX_ATTEMPTS})`);
            remainingQueue.push(operation);
          }
        }
      }

      // 남은 작업들 저장
      await this.saveQueue(remainingQueue);
      logger.log(`✅ [SyncQueue] Queue processing complete. ${remainingQueue.length} operations remaining.`);
    } catch (error) {
      logger.error('[SyncQueue] Error processing queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * 네트워크 상태 감시 시작
   */
  static startWatching(): void {
    if (this.isWatching) {
      logger.log('⚠️ [SyncQueue] Already watching network state');
      return;
    }

    logger.log('👀 [SyncQueue] Starting network state monitoring...');
    this.isWatching = true;

    NetInfo.addEventListener((state) => {
      logger.log(`📡 [SyncQueue] Network state changed: connected=${state.isConnected}, type=${state.type}`);

      if (state.isConnected) {
        logger.log('✅ [SyncQueue] Network restored, processing queue...');
        this.processQueue();
      }
    });
  }

  /**
   * 수동 재시도 (실패한 작업들)
   */
  static async retryFailed(): Promise<void> {
    try {
      const failedQueue = await this.getFailedQueue();

      if (failedQueue.length === 0) {
        logger.log('✅ [SyncQueue] No failed operations to retry');
        return;
      }

      logger.log(`🔄 [SyncQueue] Retrying ${failedQueue.length} failed operations...`);

      // 실패 큐의 작업들을 일반 큐로 이동 (attempts 리셋)
      const queue = await this.getQueue();
      for (const operation of failedQueue) {
        operation.attempts = 0;
        operation.error = undefined;
        queue.push(operation);
      }

      await this.saveQueue(queue);
      await this.saveFailedQueue([]);

      // 처리 시작
      await this.processQueue();
    } catch (error) {
      logger.error('[SyncQueue] Error retrying failed operations:', error);
    }
  }

  /**
   * 큐 상태 조회
   */
  static async getStatus(): Promise<{
    pending: number;
    failed: number;
    operations: QueuedOperation[];
    failedOperations: QueuedOperation[];
  }> {
    const queue = await this.getQueue();
    const failedQueue = await this.getFailedQueue();

    return {
      pending: queue.length,
      failed: failedQueue.length,
      operations: queue,
      failedOperations: failedQueue,
    };
  }

  /**
   * 큐 초기화 (테스트/디버깅용)
   */
  static async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
    await AsyncStorage.removeItem(FAILED_QUEUE_KEY);
    logger.log('🗑️ [SyncQueue] Queue cleared');
  }
}
