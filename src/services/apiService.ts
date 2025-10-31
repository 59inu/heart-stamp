import axios from 'axios';
import { DiaryEntry } from '../models/DiaryEntry';

// Change this to your backend server URL
const API_BASE_URL = 'http://localhost:3000/api';

export class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async uploadDiary(diary: DiaryEntry): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseURL}/diaries`, {
        _id: diary._id,
        date: diary.date,
        content: diary.content,
        aiComment: diary.aiComment,
        stampType: diary.stampType,
        createdAt: diary.createdAt,
        updatedAt: diary.updatedAt,
        syncedWithServer: diary.syncedWithServer,
      });

      return response.data.success;
    } catch (error) {
      console.error('Error uploading diary:', error);
      return false;
    }
  }

  async getAIComment(diaryId: string): Promise<{
    aiComment?: string;
    stampType?: string;
  } | null> {
    try {
      const response = await axios.get(
        `${this.baseURL}/diaries/${diaryId}/ai-comment`
      );

      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting AI comment:', error);
      return null;
    }
  }

  async triggerAnalysis(diaryId: string): Promise<{
    aiComment: string;
    stampType: string;
  } | null> {
    try {
      const response = await axios.post(
        `${this.baseURL}/diaries/${diaryId}/analyze`
      );

      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error triggering analysis:', error);
      return null;
    }
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await axios.get(
        this.baseURL.replace('/api', '/health')
      );
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Error checking server health:', error);
      return false;
    }
  }

  async registerPushToken(token: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseURL}/push/register`, {
        token,
      });
      return response.data.success;
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  }

  async syncDiaryFromServer(diaryId: string): Promise<{
    aiComment?: string;
    stampType?: string;
  } | null> {
    try {
      const response = await axios.get(
        `${this.baseURL}/diaries/${diaryId}/ai-comment`
      );
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error syncing diary from server:', error);
      return null;
    }
  }

  async getAllDiaries(): Promise<DiaryEntry[]> {
    try {
      const response = await axios.get(`${this.baseURL}/diaries`);
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting all diaries from server:', error);
      return [];
    }
  }

  async deleteDiary(diaryId: string): Promise<boolean> {
    try {
      const response = await axios.delete(`${this.baseURL}/diaries/${diaryId}`);
      return response.data.success;
    } catch (error) {
      console.error('Error deleting diary:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
