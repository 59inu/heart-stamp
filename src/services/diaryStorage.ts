import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry } from '../models/DiaryEntry';
import { apiService } from './apiService';

const STORAGE_KEY = '@stamp_diary:entries';

export class DiaryStorage {
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
   * Silent Push 수신 시 호출되어 백그라운드 데이터 새로고침
   */
  static async syncWithServer(): Promise<void> {
    console.log('🔄 [DiaryStorage] syncWithServer started...');
    try {
      // 1단계: 서버에서 전체 일기 목록 가져오기
      try {
        const serverDiaries = await apiService.getAllDiaries();
        console.log(`📥 [DiaryStorage] Server has ${serverDiaries.length} diaries`);

        // 서버에 있는 일기를 로컬에 저장 (없으면 추가, 있으면 업데이트)
        for (const serverDiary of serverDiaries) {
          await this.saveFromServer(serverDiary);
        }
        console.log(`✅ [DiaryStorage] Synced all diaries from server`);
      } catch (error) {
        console.error('❌ [DiaryStorage] Error fetching all diaries from server:', error);
      }

      // 2단계: 로컬 일기들의 AI 코멘트 동기화
      const entries = await this.getAllEntries();
      console.log(`📚 [DiaryStorage] Total local entries: ${entries.length}`);

      let updatedCount = 0;

      // 모든 일기를 서버와 동기화 (코멘트가 있어도 업데이트될 수 있음)
      console.log(`⏳ [DiaryStorage] Syncing all ${entries.length} entries with server...`);

      for (const entry of entries) {
        try {
          console.log(`🔍 [DiaryStorage] Checking diary ${entry._id}...`);
          const serverData = await apiService.syncDiaryFromServer(entry._id);
          console.log(`📦 [DiaryStorage] Server data:`, serverData);
          console.log(`📦 [DiaryStorage] Has AI comment? ${!!serverData?.aiComment}`);

          if (serverData?.aiComment) {
            console.log(`✅ [DiaryStorage] AI 코멘트 발견!`);
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
              console.log(`✅ [DiaryStorage] Updated diary ${entry._id} with AI comment from server`);
            } else {
              console.log(`ℹ️ [DiaryStorage] Diary ${entry._id} is already up to date`);
            }
          } else {
            console.log(`⚠️ [DiaryStorage] No AI comment yet for diary ${entry._id}`);
          }
        } catch (error) {
          console.error(`❌ [DiaryStorage] Error syncing diary ${entry._id}:`, error);
          // 개별 일기 동기화 실패 시 다음 일기로 계속 진행
        }
      }

      if (updatedCount > 0) {
        console.log(`🎉 [DiaryStorage] Synced ${updatedCount} diary entries with server`);
      } else {
        console.log('✅ [DiaryStorage] All diaries are up to date');
      }
    } catch (error) {
      console.error('❌ [DiaryStorage] Error syncing with server:', error);
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
