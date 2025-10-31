import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry } from '../models/DiaryEntry';

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
}
