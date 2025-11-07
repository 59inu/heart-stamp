import axios, { AxiosInstance } from 'axios';
import { DiaryEntry } from '../models/DiaryEntry';
import { Report } from '../models/Report';
import { UserService } from './userService';
import { API_BASE_URL, ENV } from '../config/environment';

export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  REQUEST_ERROR = 'REQUEST_ERROR',
}

export class ApiService {
  private baseURL: string;
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    console.log(`🌐 [apiService] Initializing with baseURL: ${this.baseURL}`);
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10초 타임아웃 (푸시 토큰 등록은 개별 설정)
    });

    // 모든 요청에 userId 헤더 추가
    this.axiosInstance.interceptors.request.use(async (config) => {
      const userId = await UserService.getOrCreateUserId();
      config.headers['X-User-Id'] = userId;
      console.log(`🔍 [apiService] Request interceptor - URL: ${config.baseURL}${config.url}`);
      console.log(`🔍 [apiService] Request method: ${config.method}`);
      console.log(`🔍 [apiService] Request headers:`, JSON.stringify(config.headers));
      console.log(`🔍 [apiService] Request data:`, JSON.stringify(config.data));
      return config;
    });

    // 응답 로깅
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ [apiService] Response from ${response.config.url}:`, JSON.stringify(response.data));
        return response;
      },
      (error) => {
        // 에러 타입 구분
        let errorType = 'unknown';
        if (error.code === 'ECONNABORTED') {
          errorType = 'timeout';
        } else if (error.code === 'ERR_NETWORK') {
          errorType = 'network';
        } else if (error.response) {
          errorType = 'server';
        }

        console.error(`❌ [apiService] Request failed [${errorType}]:`, {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          code: error.code,
        });

        return Promise.reject(error);
      }
    );
  }

  async uploadDiary(diary: DiaryEntry): Promise<boolean> {
    try {
      console.log(`📤 [apiService] Uploading diary ${diary._id} to server...`);
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

      console.log(`✅ [apiService] Diary ${diary._id} uploaded successfully`);
      return response.data.success;
    } catch (error) {
      console.error(`❌ [apiService] Error uploading diary ${diary._id}:`, error);
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

  async registerPushToken(userId: string, token: string): Promise<{
    success: boolean;
    message?: string;
    errorType?: ApiErrorType;
  }> {
    try {
      const response = await this.axiosInstance.post('/push/register', {
        userId,
        token,
      }, {
        timeout: 5000, // 푸시 토큰 등록은 5초로 짧게 설정 (재시도 3회 있으므로)
      });
      return { success: response.data.success, message: response.data.message };
    } catch (error: any) {
      // 에러 상세 정보 로깅
      if (error.response) {
        // 서버가 응답했지만 에러 상태 코드 반환
        console.error('[API] Push token registration failed:', {
          status: error.response.status,
          data: error.response.data,
        });
        return {
          success: false,
          message: error.response.data?.message || `Server error: ${error.response.status}`,
          errorType: ApiErrorType.SERVER_ERROR,
        };
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못함 (네트워크 오류)
        console.error('[API] Push token registration - no response received:', error.message);
        return {
          success: false,
          message: 'Network error: Could not reach server',
          errorType: ApiErrorType.NETWORK_ERROR,
        };
      } else {
        // 요청 설정 중 에러 발생
        console.error('[API] Push token registration - request setup failed:', error.message);
        return {
          success: false,
          message: `Request failed: ${error.message}`,
          errorType: ApiErrorType.REQUEST_ERROR,
        };
      }
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
