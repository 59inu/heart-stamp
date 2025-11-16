import axios, { AxiosInstance } from 'axios';
import { DiaryEntry } from '../models/DiaryEntry';
import { Report } from '../models/Report';
import { UserService } from './userService';
import { AuthService } from './authService';
import { API_BASE_URL, ENV } from '../config/environment';
import { getLocalizedErrorMessage, ErrorContext } from '../utils/errorMessages';
import { logger } from '../utils/logger';

export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  REQUEST_ERROR = 'REQUEST_ERROR',
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorType?: ApiErrorType };

export class ApiService {
  private baseURL: string;
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    logger.log(`🌐 [apiService] Initializing with baseURL: ${this.baseURL}`);
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10초 타임아웃 (푸시 토큰 등록은 개별 설정)
    });

    // 모든 요청에 userId 헤더와 Firebase Auth 토큰 추가
    this.axiosInstance.interceptors.request.use(async (config) => {
      const userId = await UserService.getOrCreateUserId();
      config.headers['X-User-Id'] = userId;

      // Firebase Auth 토큰 추가
      const token = await AuthService.getIdToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      logger.log(`🔍 [apiService] Request interceptor - URL: ${config.baseURL}${config.url}`);
      logger.log(`🔍 [apiService] Request method: ${config.method}`);
      logger.log(`🔍 [apiService] Request headers:`, JSON.stringify(config.headers));
      logger.log(`🔍 [apiService] Request data:`, JSON.stringify(config.data));
      return config;
    });

    // 응답 로깅
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.log(`✅ [apiService] Response from ${response.config.url}:`, JSON.stringify(response.data));
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

        logger.error(`❌ [apiService] Request failed [${errorType}]:`, {
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

  async uploadDiary(diary: DiaryEntry): Promise<ApiResult<boolean>> {
    try {
      logger.log(`📤 [apiService] Uploading diary ${diary._id} to server...`);
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

      logger.log(`✅ [apiService] Diary ${diary._id} uploaded successfully`);
      return { success: true, data: response.data.success };
    } catch (error: any) {
      logger.error(`❌ [apiService] Error uploading diary ${diary._id}:`, error);
      const errorType = error.code === 'ERR_NETWORK' ? ApiErrorType.NETWORK_ERROR : ApiErrorType.SERVER_ERROR;
      return {
        success: false,
        error: getLocalizedErrorMessage(error, ErrorContext.DIARY_UPLOAD),
        errorType
      };
    }
  }

  async getAIComment(diaryId: string): Promise<ApiResult<{
    aiComment?: string;
    stampType?: string;
  }>> {
    try {
      const response = await this.axiosInstance.get(
        `/diaries/${diaryId}/ai-comment`
      );

      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: 'AI 코멘트를 찾을 수 없습니다' };
    } catch (error: any) {
      logger.error('Error getting AI comment:', error);
      const errorType = error.code === 'ERR_NETWORK' ? ApiErrorType.NETWORK_ERROR : ApiErrorType.SERVER_ERROR;
      return {
        success: false,
        error: getLocalizedErrorMessage(error, ErrorContext.DIARY_FETCH),
        errorType
      };
    }
  }

  async triggerAnalysis(diaryId: string): Promise<ApiResult<{
    aiComment: string;
    stampType: string;
  }>> {
    try {
      const response = await this.axiosInstance.post(
        `/diaries/${diaryId}/analyze`
      );

      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: '분석 결과를 받을 수 없습니다' };
    } catch (error: any) {
      logger.error('Error triggering analysis:', error);
      const errorType = error.code === 'ERR_NETWORK' ? ApiErrorType.NETWORK_ERROR : ApiErrorType.SERVER_ERROR;
      return {
        success: false,
        error: getLocalizedErrorMessage(error, ErrorContext.DIARY_FETCH),
        errorType
      };
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
      logger.error('Error checking server health:', error);
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
        logger.error('[API] Push token registration failed:', {
          status: error.response.status,
          data: error.response.data,
        });
        return {
          success: false,
          message: getLocalizedErrorMessage(error, ErrorContext.PUSH_NOTIFICATION),
          errorType: ApiErrorType.SERVER_ERROR,
        };
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못함 (네트워크 오류)
        logger.error('[API] Push token registration - no response received:', error.message);
        return {
          success: false,
          message: getLocalizedErrorMessage(error, ErrorContext.NETWORK),
          errorType: ApiErrorType.NETWORK_ERROR,
        };
      } else {
        // 요청 설정 중 에러 발생
        logger.error('[API] Push token registration - request setup failed:', error.message);
        return {
          success: false,
          message: getLocalizedErrorMessage(error, ErrorContext.PUSH_NOTIFICATION),
          errorType: ApiErrorType.REQUEST_ERROR,
        };
      }
    }
  }

  async deletePushToken(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // userId는 인터셉터에서 X-User-Id 헤더로 자동 전송됨
      const response = await this.axiosInstance.delete('/push/unregister', {
        timeout: 5000,
      });
      return { success: response.data.success };
    } catch (error: any) {
      if (error.response) {
        logger.error('[API] Push token deletion failed:', {
          status: error.response.status,
          data: error.response.data,
        });
        return {
          success: false,
          error: getLocalizedErrorMessage(error, ErrorContext.PUSH_NOTIFICATION),
        };
      } else if (error.request) {
        logger.error('[API] Push token deletion - no response received:', error.message);
        return {
          success: false,
          error: getLocalizedErrorMessage(error, ErrorContext.NETWORK),
        };
      } else {
        logger.error('[API] Push token deletion - request setup failed:', error.message);
        return {
          success: false,
          error: getLocalizedErrorMessage(error, ErrorContext.PUSH_NOTIFICATION),
        };
      }
    }
  }

  async syncDiaryFromServer(diaryId: string): Promise<ApiResult<{
    aiComment?: string;
    stampType?: string;
  }>> {
    try {
      const response = await this.axiosInstance.get(
        `/diaries/${diaryId}/ai-comment`
      );
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: '서버 데이터를 찾을 수 없습니다' };
    } catch (error: any) {
      logger.error('Error syncing diary from server:', error);
      const errorType = error.code === 'ERR_NETWORK' ? ApiErrorType.NETWORK_ERROR : ApiErrorType.SERVER_ERROR;
      return {
        success: false,
        error: getLocalizedErrorMessage(error, ErrorContext.SYNC),
        errorType
      };
    }
  }

  async getAllDiaries(): Promise<ApiResult<DiaryEntry[]>> {
    try {
      const response = await this.axiosInstance.get('/diaries');
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: '일기 목록을 불러올 수 없습니다' };
    } catch (error: any) {
      logger.error('Error getting all diaries from server:', error);
      const errorType = error.code === 'ERR_NETWORK' ? ApiErrorType.NETWORK_ERROR : ApiErrorType.SERVER_ERROR;
      return {
        success: false,
        error: getLocalizedErrorMessage(error, ErrorContext.DIARY_FETCH),
        errorType
      };
    }
  }

  async deleteDiary(diaryId: string): Promise<ApiResult<boolean>> {
    try {
      const response = await this.axiosInstance.delete(`/diaries/${diaryId}`);
      return { success: true, data: response.data.success };
    } catch (error: any) {
      logger.error('Error deleting diary:', error);
      const errorType = error.code === 'ERR_NETWORK' ? ApiErrorType.NETWORK_ERROR : ApiErrorType.SERVER_ERROR;
      return {
        success: false,
        error: getLocalizedErrorMessage(error, ErrorContext.DIARY_DELETE),
        errorType
      };
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
      logger.error('Error getting weekly report:', error);
      return { success: false, error: getLocalizedErrorMessage(error, ErrorContext.REPORT_FETCH) };
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
      logger.error('Error creating weekly report:', error);
      return { success: false, error: getLocalizedErrorMessage(error, ErrorContext.REPORT_GENERATE) };
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
      logger.error('Error getting monthly report:', error);
      return { success: false, error: getLocalizedErrorMessage(error, ErrorContext.REPORT_FETCH) };
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
      logger.error('Error deleting weekly report:', error);
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
      logger.error('Error deleting monthly report:', error);
      return false;
    }
  }

  // 이미지 업로드
  async uploadImage(uri: string): Promise<ApiResult<string>> {
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
        let imageUrl = response.data.imageUrl;

        // S3 URL(전체 URL)이 아닌 경우에만 baseURL과 결합
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          imageUrl = `${this.baseURL.replace('/api', '')}${imageUrl}`;
        }

        return { success: true, data: imageUrl };
      }
      return { success: false, error: '이미지 업로드 응답 실패' };
    } catch (error: any) {
      logger.error('Error uploading image:', error);
      const errorType = error.code === 'ERR_NETWORK' ? ApiErrorType.NETWORK_ERROR : ApiErrorType.SERVER_ERROR;
      return {
        success: false,
        error: getLocalizedErrorMessage(error, ErrorContext.IMAGE_UPLOAD),
        errorType
      };
    }
  }
}

export const apiService = new ApiService();
