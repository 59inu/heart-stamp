import axios, { AxiosInstance } from 'axios';
import { DiaryEntry } from '../models/DiaryEntry';
import { UserService } from './userService';

// Change this to your backend server URL
const API_BASE_URL = 'http://localhost:3000/api';

export class ApiService {
  private baseURL: string;
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
    });

    // 모든 요청에 userId 헤더 추가
    this.axiosInstance.interceptors.request.use(async (config) => {
      const userId = await UserService.getOrCreateUserId();
      config.headers['X-User-Id'] = userId;
      return config;
    });
  }

  async uploadDiary(diary: DiaryEntry): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post('/diaries', {
        _id: diary._id,
        date: diary.date,
        content: diary.content,
        weather: diary.weather,
        mood: diary.mood,
        moodTag: diary.moodTag,
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
      const response = await this.axiosInstance.get(
        `/diaries/${diaryId}/ai-comment`
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
      const response = await this.axiosInstance.post(
        `/diaries/${diaryId}/analyze`
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
      // health check는 인증 없이 접근 가능하므로 일반 axios 사용
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
      const response = await this.axiosInstance.post('/push/register', {
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
      const response = await this.axiosInstance.get(
        `/diaries/${diaryId}/ai-comment`
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
      const response = await this.axiosInstance.get('/diaries');
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
      const response = await this.axiosInstance.delete(`/diaries/${diaryId}`);
      return response.data.success;
    } catch (error) {
      console.error('Error deleting diary:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
