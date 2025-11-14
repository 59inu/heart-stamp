import {
  signInAnonymously,
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { logger } from '../utils/logger';
import { auth } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_USER_ID_KEY = 'userId';
const MIGRATED_FLAG_KEY = 'firebase_migrated';

export class AuthService {
  /**
   * 익명 로그인
   * 기존 UUID 사용자를 Firebase로 마이그레이션하면서 호출
   */
  static async signInAnonymous(): Promise<User> {
    try {
      const userCredential = await signInAnonymously(auth);
      logger.log('✅ Firebase 익명 로그인 성공:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      logger.error('❌ Firebase 익명 로그인 실패:', error);
      throw new Error('인증에 실패했습니다. 다시 시도해주세요.');
    }
  }

  /**
   * 현재 로그인된 사용자 가져오기
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * 현재 사용자의 ID Token 가져오기 (API 요청에 사용)
   */
  static async getIdToken(): Promise<string | null> {
    const user = this.getCurrentUser();
    if (!user) {
      return null;
    }

    try {
      const token = await user.getIdToken();
      return token;
    } catch (error) {
      logger.error('❌ ID Token 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 인증 상태 변경 리스너
   */
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * 로그아웃
   */
  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      logger.log('✅ 로그아웃 성공');
    } catch (error) {
      logger.error('❌ 로그아웃 실패:', error);
      throw error;
    }
  }

  /**
   * 기존 UUID 사용자를 Firebase로 마이그레이션
   * 앱 시작 시 한 번 호출
   */
  static async migrateFromLegacyAuth(): Promise<{ userId: string; isNewUser: boolean }> {
    // 이미 마이그레이션했는지 확인
    const isMigrated = await AsyncStorage.getItem(MIGRATED_FLAG_KEY);

    if (isMigrated === 'true') {
      // 이미 마이그레이션 완료 - 현재 Firebase 사용자 확인
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        return { userId: currentUser.uid, isNewUser: false };
      }
    }

    // 기존 UUID 가져오기
    const legacyUserId = await AsyncStorage.getItem(LEGACY_USER_ID_KEY);

    // Firebase 익명 로그인
    const user = await this.signInAnonymous();

    // 기존 사용자가 있었다면 서버에 마이그레이션 요청
    if (legacyUserId) {
      logger.log(`🔄 기존 사용자 마이그레이션: ${legacyUserId} → ${user.uid}`);
      // 서버에 마이그레이션 요청 (나중에 구현)
      // await apiService.migrateUser(legacyUserId, user.uid);

      // 기존 userId를 백업으로 저장
      await AsyncStorage.setItem('legacy_user_id_backup', legacyUserId);
    }

    // 마이그레이션 완료 플래그 설정
    await AsyncStorage.setItem(MIGRATED_FLAG_KEY, 'true');
    await AsyncStorage.setItem(LEGACY_USER_ID_KEY, user.uid);

    return {
      userId: user.uid,
      isNewUser: !legacyUserId,
      legacyUserId
    } as any;
  }

  /**
   * 앱 시작 시 인증 초기화
   */
  static async initialize(): Promise<User> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe(); // 첫 번째 상태 변경만 처리

        if (user) {
          // 이미 로그인되어 있음
          logger.log('✅ 기존 Firebase 세션 복구:', user.uid);
          resolve(user);
        } else {
          // 로그인 필요 - 마이그레이션 실행
          try {
            const { userId } = await this.migrateFromLegacyAuth();
            const currentUser = this.getCurrentUser();
            if (currentUser) {
              resolve(currentUser);
            } else {
              reject(new Error('인증 초기화 실패'));
            }
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }
}
