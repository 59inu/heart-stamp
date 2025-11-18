import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry } from '../models/DiaryEntry';
import { apiService } from './apiService';
import { logger } from '../utils/logger';

const STORAGE_KEY = '@stamp_diary:entries';

export class DiaryStorage {
  private static isSyncing = false;

  private static async getAllEntries(): Promise<DiaryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error loading diaries:', error);
      return [];
    }
  }

  private static async saveAllEntries(entries: DiaryEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      logger.error('Error saving diaries:', error);
      throw error;
    }
  }

  static async getAll(): Promise<DiaryEntry[]> {
    const entries = await this.getAllEntries();
    return entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  static async getById(id: string): Promise<DiaryEntry | null> {
    const entries = await this.getAllEntries();
    return entries.find((entry) => entry._id === id) || null;
  }

  static async create(entry: Omit<DiaryEntry, '_id' | 'createdAt' | 'updatedAt'>): Promise<DiaryEntry> {
    const entries = await this.getAllEntries();

    // 같은 날짜의 일기가 이미 있는지 체크
    const existingEntry = await this.getByDate(entry.date);
    if (existingEntry) {
      logger.warn(`⚠️ 같은 날짜(${entry.date})의 일기가 이미 존재합니다. 기존 일기를 반환합니다.`);
      throw new Error('같은 날짜의 일기가 이미 존재합니다.');
    }

    const newEntry: DiaryEntry = {
      ...entry,
      _id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    entries.push(newEntry);
    await this.saveAllEntries(entries);
    return newEntry;
  }

  static async getByDate(date: string): Promise<DiaryEntry | null> {
    const entries = await this.getAllEntries();
    const targetDate = new Date(date).toISOString().split('T')[0];
    return entries.find((entry) => {
      const entryDate = new Date(entry.date).toISOString().split('T')[0];
      return entryDate === targetDate;
    }) || null;
  }

  // 서버에서 가져온 데이터를 저장 (userId는 제외 - 로컬에서 관리)
  static async saveFromServer(entry: DiaryEntry): Promise<DiaryEntry> {
    const entries = await this.getAllEntries();
    const existing = entries.find((e) => e._id === entry._id);

    // userId는 서버 데이터에서 제거 (로컬에서 관리되어야 함)
    const { userId, ...entryWithoutUserId } = entry;

    if (existing) {
      // 이미 존재하면 업데이트 (userId 제외)
      return (await this.update(entry._id, entryWithoutUserId))!;
    } else {
      // 없으면 새로 추가 (userId 제외)
      entries.push(entryWithoutUserId as DiaryEntry);
      await this.saveAllEntries(entries);
      return entryWithoutUserId as DiaryEntry;
    }
  }

  static async update(id: string, updates: Partial<DiaryEntry>): Promise<DiaryEntry | null> {
    const entries = await this.getAllEntries();
    const index = entries.findIndex((entry) => entry._id === id);

    if (index === -1) {
      return null;
    }

    entries[index] = {
      ...entries[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveAllEntries(entries);
    return entries[index];
  }

  static async delete(id: string): Promise<boolean> {
    const entries = await this.getAllEntries();
    const filteredEntries = entries.filter((entry) => entry._id !== id);

    if (filteredEntries.length === entries.length) {
      return false;
    }

    await this.saveAllEntries(filteredEntries);
    return true;
  }

  private static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 서버와 양방향 동기화 (LWW - Last Write Wins)
   * 중복 실행 방지 기능 포함
   * @returns { success: boolean, error?: string, alreadySyncing?: boolean }
   */
  static async syncWithServer(): Promise<{ success: boolean; error?: string; alreadySyncing?: boolean }> {
    // 이미 동기화 중이면 스킵
    if (this.isSyncing) {
      logger.log('⏭️ [DiaryStorage] Sync already in progress, skipping...');
      return { success: false, error: '이미 동기화 중입니다', alreadySyncing: true };
    }

    this.isSyncing = true;
    logger.log('🔄 [DiaryStorage] LWW bidirectional sync started...');
    try {
      // 1. 서버에서 전체 일기 목록 가져오기
      const result = await apiService.getAllDiaries();

      if (!result.success) {
        logger.error('❌ [DiaryStorage] Failed to fetch diaries:', result.error);
        return { success: false, error: result.error };
      }

      const serverDiaries = result.data;
      logger.log(`📥 [DiaryStorage] Server has ${serverDiaries.length} diaries`);

      // 2. 로컬 일기 목록 가져오기
      const localDiaries = await this.getAllEntries();
      logger.log(`📚 [DiaryStorage] Local has ${localDiaries.length} diaries`);

      // 3. Map으로 변환 (빠른 조회)
      const serverMap = new Map(serverDiaries.map(d => [d._id, d]));
      const localMap = new Map(localDiaries.map(d => [d._id, d]));

      let uploadCount = 0;
      let downloadCount = 0;
      let mergeCount = 0;
      let hasLocalUpdates = false;

      // 4. 로컬 일기 순회 - 업로드 또는 병합 필요 판단
      for (let i = 0; i < localDiaries.length; i++) {
        const local = localDiaries[i];
        const server = serverMap.get(local._id);

        if (!server) {
          // 4-1. 서버에 없음 → 업로드
          const uploadResult = await apiService.uploadDiary(local);
          if (uploadResult.success) {
            localDiaries[i] = {
              ...local,
              syncedWithServer: true,
            };
            hasLocalUpdates = true;
            uploadCount++;
            logger.log(`⬆️ [Sync] Uploaded diary ${local._id}`);
          }
        } else {
          // 4-2. 양쪽 다 있음 → LWW 병합
          const localTime = new Date(local.updatedAt).getTime();
          const serverTime = new Date(server.updatedAt).getTime();

          // AI 코멘트는 서버 우선 (서버에서만 생성되므로)
          const hasNewAIComment = server.aiComment &&
                                 server.aiComment !== local.aiComment;

          if (hasNewAIComment) {
            // AI 코멘트를 로컬에 병합
            localDiaries[i] = {
              ...localDiaries[i],
              aiComment: server.aiComment,
              stampType: server.stampType,
              syncedWithServer: true,
            };
            hasLocalUpdates = true;
            mergeCount++;
            logger.log(`🔀 [Sync] Merged AI comment for diary ${local._id}`);
          }

          // 나머지 필드는 타임스탬프로 판단
          if (localTime > serverTime) {
            // 로컬이 더 최신 → 서버 업데이트
            const uploadResult = await apiService.uploadDiary(localDiaries[i]);
            if (uploadResult.success) {
              localDiaries[i] = {
                ...localDiaries[i],
                syncedWithServer: true,
              };
              hasLocalUpdates = true;
              uploadCount++;
              logger.log(`⬆️ [Sync] Uploaded newer local diary ${local._id}`);
            }
          } else if (serverTime > localTime) {
            // 서버가 더 최신 → 로컬 업데이트 (userId 제외)
            const { userId: _, ...serverDataWithoutUserId } = server;
            localDiaries[i] = {
              ...localDiaries[i], // 로컬 userId 보존
              ...serverDataWithoutUserId,
              syncedWithServer: true,
            };
            hasLocalUpdates = true;
            mergeCount++;
            logger.log(`⬇️ [Sync] Updated local diary ${local._id} from server`);
          } else if (serverTime === localTime) {
            // 타임스탬프 동일 → 서버 우선
            const { userId: _, ...serverDataWithoutUserId } = server;
            localDiaries[i] = {
              ...localDiaries[i], // 로컬 userId 보존
              ...serverDataWithoutUserId,
              syncedWithServer: true,
            };
            hasLocalUpdates = true;
            mergeCount++;
            logger.log(`🔀 [Sync] Server priority for diary ${local._id} (same timestamp)`);
          }
        }
      }

      // 5. 서버에만 있는 일기 → 로컬에 다운로드
      for (const server of serverDiaries) {
        if (!localMap.has(server._id)) {
          // userId 제외하고 로컬에 추가
          const { userId: _, ...serverDataWithoutUserId } = server;
          localDiaries.push(serverDataWithoutUserId as DiaryEntry);
          hasLocalUpdates = true;
          downloadCount++;
          logger.log(`⬇️ [Sync] Downloaded diary ${server._id} from server`);
        }
      }

      // 6. 로컬 변경사항 저장 (배치 업데이트 - 한 번만 저장)
      if (hasLocalUpdates) {
        await this.saveAllEntries(localDiaries);
      }

      logger.log(`🎉 [Sync] Complete: ⬆️${uploadCount} ⬇️${downloadCount} 🔀${mergeCount}`);
      return { success: true };
    } catch (error: any) {
      logger.error('❌ [DiaryStorage] Error syncing with server:', error);
      return { success: false, error: error.message || '동기화 중 오류 발생' };
    } finally {
      this.isSyncing = false;
      logger.log('🏁 [DiaryStorage] Sync completed, lock released');
    }
  }

  // 개발/디버깅용: 모든 로컬 데이터 클리어
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      logger.log('✅ All local diary data cleared');
    } catch (error) {
      logger.error('Error clearing diary data:', error);
      throw error;
    }
  }
}
