import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'userId';
const USER_ID_FALLBACK_KEY = '@user_id_fallback';

export class UserService {
  /**
   * 사용자 ID를 가져오거나 생성합니다.
   * 앱 첫 실행 시 고유한 UUID를 생성하고 SecureStore에 안전하게 저장합니다.
   * SecureStore는 iOS Keychain과 Android Keystore를 사용하여 암호화 저장합니다.
   * SecureStore 실패 시 AsyncStorage로 fallback하여 ID 일관성을 보장합니다.
   */
  static async getOrCreateUserId(): Promise<string> {
    try {
      // 기존 userId 확인 (SecureStore 사용)
      let userId = await SecureStore.getItemAsync(USER_ID_KEY);

      if (!userId) {
        // 새로운 고유 ID 생성
        userId = uuidv4();
        await SecureStore.setItemAsync(USER_ID_KEY, userId);
        // fallback에도 저장
        await AsyncStorage.setItem(USER_ID_FALLBACK_KEY, userId);
        logger.log('✅ 새 사용자 ID 생성 (SecureStore + fallback):', userId);
      } else {
        logger.log('📱 기존 사용자 ID (SecureStore):', userId);
        // fallback에도 동기화
        await AsyncStorage.setItem(USER_ID_FALLBACK_KEY, userId).catch(() => {});
      }

      return userId;
    } catch (error) {
      logger.error('❌ SecureStore 실패, AsyncStorage fallback 시도:', error);

      // SecureStore 실패 시 AsyncStorage에서 ID 가져오기
      try {
        let fallbackUserId = await AsyncStorage.getItem(USER_ID_FALLBACK_KEY);

        if (!fallbackUserId) {
          // fallback에도 없으면 새로 생성하여 저장
          fallbackUserId = uuidv4();
          await AsyncStorage.setItem(USER_ID_FALLBACK_KEY, fallbackUserId);
          logger.log('✅ 새 사용자 ID 생성 (AsyncStorage fallback):', fallbackUserId);
        } else {
          logger.log('📱 기존 사용자 ID (AsyncStorage fallback):', fallbackUserId);
        }

        return fallbackUserId;
      } catch (fallbackError) {
        logger.error('❌ AsyncStorage fallback도 실패, 임시 ID 사용:', fallbackError);
        // 최후의 수단: 메모리 ID (앱 재시작 시 변경됨을 경고)
        const tempId = uuidv4();
        logger.warn('⚠️ 경고: 임시 ID 사용 중. 앱 재시작 시 ID가 변경될 수 있습니다.');
        return tempId;
      }
    }
  }

  /**
   * 현재 저장된 사용자 ID를 반환합니다 (없으면 null)
   */
  static async getUserId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(USER_ID_KEY);
    } catch (error) {
      logger.error('❌ 사용자 ID 조회 실패:', error);
      return null;
    }
  }

  /**
   * 테스트용: 사용자 ID를 초기화합니다
   */
  static async resetUserId(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      logger.log('🔄 사용자 ID 초기화됨 (SecureStore)');
    } catch (error) {
      logger.error('❌ 사용자 ID 초기화 실패:', error);
    }
  }
}
