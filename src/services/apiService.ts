import axios, { AxiosInstance } from 'axios';
import { DiaryEntry } from '../models/DiaryEntry';
import { Report } from '../models/Report';
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

  // 주간 리포트 조회 (조회만, 생성 안 함)
  async getWeeklyReport(
    year: number,
    week: number
  ): Promise<
    | { success: true; report: Report }
    | { success: false; error: string; diaryCount?: number; canGenerate?: boolean }
  > {
    try {
      const response = await this.axiosInstance.get(
        `/reports/weekly/${year}/${week}`
      );
      if (response.data.success) {
        return { success: true, report: response.data.data };
      } else {
        return {
          success: false,
          error: response.data.message,
          diaryCount: response.data.diaryCount,
          canGenerate: response.data.canGenerate,
        };
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
          diaryCount: error.response.data.diaryCount,
          canGenerate: error.response.data.canGenerate,
        };
      }
      console.error('Error getting weekly report:', error);
      return { success: false, error: 'Unknown error' };
    }
  }

  // 주간 리포트 생성
  async createWeeklyReport(
    year: number,
    week: number
  ): Promise<
    | { success: true; report: Report }
    | { success: false; error: string; diaryCount?: number }
  > {
    try {
      const response = await this.axiosInstance.post(
        `/reports/weekly/${year}/${week}`
      );
      return { success: true, report: response.data.data };
    } catch (error: any) {
      if (error.response?.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
          diaryCount: error.response.data.diaryCount,
        };
      }
      console.error('Error creating weekly report:', error);
      return { success: false, error: 'Unknown error' };
    }
  }

  // 월간 리포트 조회/생성
  async getMonthlyReport(
    year: number,
    month: number
  ): Promise<
    | { success: true; report: Report }
    | { success: false; error: string; diaryCount?: number }
  > {
    try {
      const response = await this.axiosInstance.get(
        `/reports/monthly/${year}/${month}`
      );
      return { success: true, report: response.data.data };
    } catch (error: any) {
      if (error.response?.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
          diaryCount: error.response.data.diaryCount,
        };
      }
      console.error('Error getting monthly report:', error);
      return { success: false, error: 'Unknown error' };
    }
  }

  // 주간 리포트 삭제
  async deleteWeeklyReport(year: number, week: number): Promise<boolean> {
    try {
      const response = await this.axiosInstance.delete(
        `/reports/weekly/${year}/${week}`
      );
      return response.data.success;
    } catch (error) {
      console.error('Error deleting weekly report:', error);
      return false;
    }
  }

  // 월간 리포트 삭제
  async deleteMonthlyReport(year: number, month: number): Promise<boolean> {
    try {
      const response = await this.axiosInstance.delete(
        `/reports/monthly/${year}/${month}`
      );
      return response.data.success;
    } catch (error) {
      console.error('Error deleting monthly report:', error);
      return false;
    }
  }

  // 이미지 업로드
  async uploadImage(uri: string): Promise<string | null> {
    try {
      const formData = new FormData();

      // URI에서 파일명 추출
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // @ts-ignore - FormData append with file object
      formData.append('image', {
        uri,
        name: filename,
        type,
      });

      const response = await this.axiosInstance.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // 서버 URL과 결합하여 전체 URL 반환
        return `${this.baseURL.replace('/api', '')}${response.data.imageUrl}`;
      }
      return null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }
}

export const apiService = new ApiService();
