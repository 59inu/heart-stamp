import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry } from '../models/DiaryEntry';
import { apiService } from './apiService';

const STORAGE_KEY = '@stamp_diary:entries';

export class DiaryStorage {
  private static isSyncing = false;

  private static async getAllEntries(): Promise<DiaryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading diaries:', error);
      return [];
    }
  }

  private static async saveAllEntries(entries: DiaryEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving diaries:', error);
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
      console.warn(`⚠️ 같은 날짜(${entry.date})의 일기가 이미 존재합니다. 기존 일기를 반환합니다.`);
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

  // 서버에서 가져온 데이터를 그대로 저장 (ID 포함)
  static async saveFromServer(entry: DiaryEntry): Promise<DiaryEntry> {
    const entries = await this.getAllEntries();
    const existing = entries.find((e) => e._id === entry._id);

    if (existing) {
      // 이미 존재하면 업데이트
      return (await this.update(entry._id, entry))!;
    } else {
      // 없으면 새로 추가
      entries.push(entry);
      await this.saveAllEntries(entries);
      return entry;
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
   * 서버에서 AI 코멘트 업데이트 동기화
   * 중복 실행 방지 기능 포함
   */
  static async syncWithServer(): Promise<void> {
    // 이미 동기화 중이면 스킵
    if (this.isSyncing) {
      console.log('⏭️ [DiaryStorage] Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    console.log('🔄 [DiaryStorage] syncWithServer started...');
    try {
      // 서버에서 전체 일기 목록 가져오기 (한 번의 API 호출로 모든 데이터 획득)
      const serverDiaries = await apiService.getAllDiaries();
      console.log(`📥 [DiaryStorage] Server has ${serverDiaries.length} diaries`);

      // 서버 데이터를 Map으로 변환 (빠른 조회를 위해)
      const serverDiaryMap = new Map(
        serverDiaries.map(diary => [diary._id, diary])
      );

      // 로컬 일기 목록 가져오기
      const entries = await this.getAllEntries();
      console.log(`📚 [DiaryStorage] Total local entries: ${entries.length}`);

      let updatedCount = 0;
      let addedCount = 0;

      // 서버에만 있는 일기 로컬에 추가
      for (const serverDiary of serverDiaries) {
        const localEntry = entries.find(e => e._id === serverDiary._id);
        if (!localEntry) {
          await this.saveFromServer(serverDiary);
          addedCount++;
        }
      }

      // 로컬 일기를 서버 데이터와 동기화 (N+1 쿼리 제거)
      for (const entry of entries) {
        const serverData = serverDiaryMap.get(entry._id);

        if (serverData?.aiComment) {
          // 서버 데이터가 로컬과 다른 경우에만 업데이트
          const needsUpdate =
            entry.aiComment !== serverData.aiComment ||
            entry.stampType !== serverData.stampType;

          if (needsUpdate) {
            await this.update(entry._id, {
              aiComment: serverData.aiComment,
              stampType: serverData.stampType,
              syncedWithServer: true,
            });
            updatedCount++;
            console.log(`✅ [DiaryStorage] Updated diary ${entry._id} with AI comment`);
          }
        }
      }

      if (addedCount > 0 || updatedCount > 0) {
        console.log(`🎉 [DiaryStorage] Sync complete: ${addedCount} added, ${updatedCount} updated`);
      } else {
        console.log('✅ [DiaryStorage] All diaries are up to date');
      }
    } catch (error) {
      console.error('❌ [DiaryStorage] Error syncing with server:', error);
    } finally {
      this.isSyncing = false;
      console.log('🏁 [DiaryStorage] Sync completed, lock released');
    }
  }

  // 개발/디버깅용: 모든 로컬 데이터 클리어
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('✅ All local diary data cleared');
    } catch (error) {
      console.error('Error clearing diary data:', error);
      throw error;
    }
  }
}
