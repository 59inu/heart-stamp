/**
 * DiaryStorage.syncWithServer() 테스트
 *
 * 목적: LWW (Last Write Wins) 양방향 동기화 로직 검증
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryStorage } from '../../src/services/diaryStorage';
import { apiService } from '../../src/services/apiService';
import { DiaryEntry } from '../../src/models/DiaryEntry';

// Mocks
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../src/services/apiService', () => ({
  apiService: {
    getAllDiaries: jest.fn(),
    uploadDiary: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('DiaryStorage.syncWithServer()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // A. 로컬→서버 업로드 시나리오
  // ==========================================
  describe('Upload: Local → Server', () => {
    it('Test 1: 로컬에만 있는 일기 업로드', async () => {
      // Given: 로컬에 일기 3개, 서버 비어있음
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'local-1',
          date: '2025-01-01T00:00:00.000Z',
          content: '로컬 일기 1',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'local-2',
          date: '2025-01-02T00:00:00.000Z',
          content: '로컬 일기 2',
          createdAt: '2025-01-02T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'local-3',
          date: '2025-01-03T00:00:00.000Z',
          content: '로컬 일기 3',
          createdAt: '2025-01-03T10:00:00.000Z',
          updatedAt: '2025-01-03T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: [], // 서버 비어있음
      });
      (apiService.uploadDiary as jest.Mock).mockResolvedValue({
        success: true,
      });

      // When: syncWithServer() 실행
      const result = await DiaryStorage.syncWithServer();

      // Then
      expect(result.success).toBe(true);
      expect(apiService.uploadDiary).toHaveBeenCalledTimes(3);
      expect(apiService.uploadDiary).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'local-1' })
      );
      expect(apiService.uploadDiary).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'local-2' })
      );
      expect(apiService.uploadDiary).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'local-3' })
      );
    });

    it('Test 2: 서버 리셋 후 재업로드 (Railway 리셋 시뮬레이션)', async () => {
      // Given: 로컬에 일기 5개 (모두 syncedWithServer: true), 서버 비어있음
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기 A',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'B',
          date: '2025-01-02T00:00:00.000Z',
          content: '일기 B',
          createdAt: '2025-01-02T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'C',
          date: '2025-01-03T00:00:00.000Z',
          content: '일기 C',
          createdAt: '2025-01-03T10:00:00.000Z',
          updatedAt: '2025-01-03T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'D',
          date: '2025-01-04T00:00:00.000Z',
          content: '일기 D',
          createdAt: '2025-01-04T10:00:00.000Z',
          updatedAt: '2025-01-04T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'E',
          date: '2025-01-05T00:00:00.000Z',
          content: '일기 E',
          createdAt: '2025-01-05T10:00:00.000Z',
          updatedAt: '2025-01-05T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: [], // 서버가 리셋되어 비어있음
      });
      (apiService.uploadDiary as jest.Mock).mockResolvedValue({
        success: true,
      });

      // When: syncWithServer() 실행
      const result = await DiaryStorage.syncWithServer();

      // Then: 5개 모두 재업로드
      expect(result.success).toBe(true);
      expect(apiService.uploadDiary).toHaveBeenCalledTimes(5);
    });

    it('Test 3: 부분 업로드 (일부만 서버에 없음)', async () => {
      // Given: 로컬 A,B,C / 서버 A,B
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기 A',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'B',
          date: '2025-01-02T00:00:00.000Z',
          content: '일기 B',
          createdAt: '2025-01-02T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'C',
          date: '2025-01-03T00:00:00.000Z',
          content: '일기 C',
          createdAt: '2025-01-03T10:00:00.000Z',
          updatedAt: '2025-01-03T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      const serverDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기 A',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'B',
          date: '2025-01-02T00:00:00.000Z',
          content: '일기 B',
          createdAt: '2025-01-02T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: serverDiaries,
      });
      (apiService.uploadDiary as jest.Mock).mockResolvedValue({
        success: true,
      });

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: C만 업로드
      expect(result.success).toBe(true);
      expect(apiService.uploadDiary).toHaveBeenCalledTimes(1);
      expect(apiService.uploadDiary).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'C' })
      );
    });
  });

  // ==========================================
  // B. 서버→로컬 다운로드 시나리오
  // ==========================================
  describe('Download: Server → Local', () => {
    it('Test 4: 서버에만 있는 일기 다운로드', async () => {
      // Given: 로컬 A / 서버 A,B,C
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기 A',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      const serverDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기 A',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'B',
          date: '2025-01-02T00:00:00.000Z',
          content: '일기 B (다른 디바이스)',
          createdAt: '2025-01-02T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'C',
          date: '2025-01-03T00:00:00.000Z',
          content: '일기 C (다른 디바이스)',
          createdAt: '2025-01-03T10:00:00.000Z',
          updatedAt: '2025-01-03T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: serverDiaries,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: B, C가 로컬에 추가됨
      expect(result.success).toBe(true);

      // setItem이 호출되었는지 확인 (로컬에 저장)
      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1];
      const savedDiaries = JSON.parse(savedData);

      expect(savedDiaries).toHaveLength(3);
      expect(savedDiaries.find((d: DiaryEntry) => d._id === 'B')).toBeDefined();
      expect(savedDiaries.find((d: DiaryEntry) => d._id === 'C')).toBeDefined();
    });

    it('Test 5: AI 코멘트 다운로드', async () => {
      // Given: 로컬 일기에는 AI 코멘트 없음, 서버에는 있음
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '오늘의 일기',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
          aiComment: undefined,
          stampType: undefined,
        },
      ];

      const serverDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '오늘의 일기',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
          aiComment: '선생님의 따뜻한 코멘트',
          stampType: 'excellent',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: serverDiaries,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: AI 코멘트가 로컬에 추가됨
      expect(result.success).toBe(true);

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1];
      const savedDiaries = JSON.parse(savedData);

      expect(savedDiaries[0].aiComment).toBe('선생님의 따뜻한 코멘트');
      expect(savedDiaries[0].stampType).toBe('excellent');
    });
  });

  // ==========================================
  // C. LWW 충돌 해결 시나리오
  // ==========================================
  describe('LWW Conflict Resolution', () => {
    it('Test 6: 로컬이 더 최신 → 서버 업데이트', async () => {
      // Given: 로컬이 더 최신
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '수정된 내용',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z', // 더 최신
        },
      ];

      const serverDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '원본 내용',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z', // 더 오래됨
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: serverDiaries,
      });
      (apiService.uploadDiary as jest.Mock).mockResolvedValue({
        success: true,
      });

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: 로컬 → 서버 업로드
      expect(result.success).toBe(true);
      expect(apiService.uploadDiary).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'A',
          content: '수정된 내용',
        })
      );
    });

    it('Test 7: 서버가 더 최신 → 로컬 업데이트', async () => {
      // Given: 서버가 더 최신
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '원본 내용',
          mood: 'green',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z', // 더 오래됨
        },
      ];

      const serverDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '수정된 내용',
          mood: 'yellow',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z', // 더 최신
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: serverDiaries,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: 서버 → 로컬 업데이트
      expect(result.success).toBe(true);

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1];
      const savedDiaries = JSON.parse(savedData);

      expect(savedDiaries[0].content).toBe('수정된 내용');
      expect(savedDiaries[0].mood).toBe('yellow');
    });

    it('Test 8: AI 코멘트 병합 (로컬 최신 + 서버 AI 코멘트)', async () => {
      // Given: 로컬 수정본 최신, 서버에 AI 코멘트
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '오늘 수정한 내용',
          aiComment: undefined,
          stampType: undefined,
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z', // 더 최신
        },
      ];

      const serverDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '원본 내용',
          aiComment: '선생님 코멘트',
          stampType: 'excellent',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z', // 더 오래됨
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: serverDiaries,
      });
      (apiService.uploadDiary as jest.Mock).mockResolvedValue({
        success: true,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: 로컬 content 유지 + 서버 AI 코멘트 추가
      expect(result.success).toBe(true);

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1];
      const savedDiaries = JSON.parse(savedData);

      // 로컬 데이터 유지 (더 최신)
      expect(savedDiaries[0].content).toBe('오늘 수정한 내용');

      // 서버 AI 코멘트 병합
      expect(savedDiaries[0].aiComment).toBe('선생님 코멘트');
      expect(savedDiaries[0].stampType).toBe('excellent');

      // 서버도 업데이트되어야 함 (로컬 content 반영)
      expect(apiService.uploadDiary).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '오늘 수정한 내용',
        })
      );
    });

    it('Test 9: 타임스탬프 동일 → 서버 우선', async () => {
      // Given: updatedAt 동일
      const sameTimestamp = '2025-01-01T10:00:00.000Z';

      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '로컬 내용',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: sameTimestamp,
        },
      ];

      const serverDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '서버 내용',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: sameTimestamp,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: serverDiaries,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: 서버 데이터 우선
      expect(result.success).toBe(true);

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1];
      const savedDiaries = JSON.parse(savedData);

      expect(savedDiaries[0].content).toBe('서버 내용');
    });

    it('Test 10: userId 보존 (절대 변경되지 않음)', async () => {
      // Given: 서버와 로컬의 userId가 다름
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기',
          userId: 'user-local-123',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      const serverDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기',
          userId: 'user-server-456',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: serverDiaries,
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: 로컬 userId 보존
      expect(result.success).toBe(true);

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1];
      const savedDiaries = JSON.parse(savedData);

      // userId는 변경되지 않음
      expect(savedDiaries[0].userId).toBe('user-local-123');
    });
  });

  // ==========================================
  // D. 에러 처리 시나리오
  // ==========================================
  describe('Error Handling', () => {
    it('Test 11: 네트워크 오류 시 롤백', async () => {
      // Given: apiService.getAllDiaries() 실패
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기 A',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: 에러 반환, 로컬 데이터 변경 없음
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('Test 12: 부분 실패 처리 (일부 업로드 실패)', async () => {
      // Given: 일기 A, B, C 중 B만 업로드 실패
      const localDiaries: DiaryEntry[] = [
        {
          _id: 'A',
          date: '2025-01-01T00:00:00.000Z',
          content: '일기 A',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'B',
          date: '2025-01-02T00:00:00.000Z',
          content: '일기 B',
          createdAt: '2025-01-02T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z',
          syncedWithServer: false,
        },
        {
          _id: 'C',
          date: '2025-01-03T00:00:00.000Z',
          content: '일기 C',
          createdAt: '2025-01-03T10:00:00.000Z',
          updatedAt: '2025-01-03T10:00:00.000Z',
          syncedWithServer: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(localDiaries)
      );
      (apiService.getAllDiaries as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      // B만 실패
      (apiService.uploadDiary as jest.Mock).mockImplementation((diary: DiaryEntry) => {
        if (diary._id === 'B') {
          return Promise.resolve({ success: false, error: 'Upload failed' });
        }
        return Promise.resolve({ success: true });
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // When
      const result = await DiaryStorage.syncWithServer();

      // Then: A, C 성공 / B는 syncedWithServer: false 유지
      expect(result.success).toBe(true);
      expect(apiService.uploadDiary).toHaveBeenCalledTimes(3);

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1];
      const savedDiaries = JSON.parse(savedData);

      expect(savedDiaries.find((d: DiaryEntry) => d._id === 'A').syncedWithServer).toBe(true);
      expect(savedDiaries.find((d: DiaryEntry) => d._id === 'B').syncedWithServer).toBe(false);
      expect(savedDiaries.find((d: DiaryEntry) => d._id === 'C').syncedWithServer).toBe(true);
    });
  });
});
