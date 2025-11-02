import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'userId';

export class UserService {
  /**
   * 사용자 ID를 가져오거나 생성합니다.
   * 앱 첫 실행 시 고유한 UUID를 생성하고 SecureStore에 안전하게 저장합니다.
   * SecureStore는 iOS Keychain과 Android Keystore를 사용하여 암호화 저장합니다.
   */
  static async getOrCreateUserId(): Promise<string> {
    try {
      // 기존 userId 확인 (SecureStore 사용)
      let userId = await SecureStore.getItemAsync(USER_ID_KEY);

      if (!userId) {
        // 새로운 고유 ID 생성
        userId = uuidv4();
        await SecureStore.setItemAsync(USER_ID_KEY, userId);
        console.log('✅ 새 사용자 ID 생성 (SecureStore):', userId);
      } else {
        console.log('📱 기존 사용자 ID (SecureStore):', userId);
      }

      return userId;
    } catch (error) {
      console.error('❌ 사용자 ID 가져오기 실패:', error);
      // 실패 시 임시 ID 생성 (다음 실행 시 다시 시도)
      return uuidv4();
    }
  }

  /**
   * 현재 저장된 사용자 ID를 반환합니다 (없으면 null)
   */
  static async getUserId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(USER_ID_KEY);
    } catch (error) {
      console.error('❌ 사용자 ID 조회 실패:', error);
      return null;
    }
  }

  /**
   * 테스트용: 사용자 ID를 초기화합니다
   */
  static async resetUserId(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      console.log('🔄 사용자 ID 초기화됨 (SecureStore)');
    } catch (error) {
      console.error('❌ 사용자 ID 초기화 실패:', error);
    }
  }
}
