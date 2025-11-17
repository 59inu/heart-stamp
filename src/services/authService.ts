import {
  signInAnonymously,
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { auth } from '../config/firebaseConfig';
import { apiService } from './apiService';

export class AuthService {
  /**
   * Firebase 익명 로그인
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
   * 앱 시작 시 인증 초기화
   * 기존 세션이 있으면 복구하고, 없으면 새로 익명 로그인
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
          // 로그인 필요 - 익명 로그인 실행
          try {
            const newUser = await this.signInAnonymous();
            resolve(newUser);
          } catch (error) {
            logger.error('❌ Firebase 익명 로그인 실패:', error);
            reject(error);
          }
        }
      });
    });
  }

  /**
   * 사용자 데이터 마이그레이션 (Firebase UID -> SecureStore UUID)
   * 앱 시작 시 한 번만 실행되며, 이미 마이그레이션된 경우 스킵
   */
  static async migrateUserData(): Promise<void> {
    try {
      const firebaseUid = auth.currentUser?.uid;
      if (!firebaseUid) {
        logger.warn('⚠️ [Migration] No Firebase user found, skipping migration');
        return;
      }

      // 이미 마이그레이션 완료되었는지 확인
      const migrationKey = `migration_done_${firebaseUid}`;
      const alreadyMigrated = await AsyncStorage.getItem(migrationKey);
      if (alreadyMigrated === 'true') {
        logger.log('ℹ️ [Migration] Already migrated for Firebase UID:', firebaseUid);
        return;
      }

      logger.log('🔄 [Migration] Starting migration for Firebase UID:', firebaseUid);

      // 마이그레이션 API 호출
      const result = await apiService.migrateDiaries(firebaseUid);

      if (result.success) {
        const { migratedCount } = result.data;
        logger.log(`✅ [Migration] Migration completed: ${migratedCount} diaries migrated`);

        // 마이그레이션 완료 표시
        await AsyncStorage.setItem(migrationKey, 'true');
      } else {
        logger.error('❌ [Migration] Migration failed:', result.error);
        // 실패해도 앱 사용은 가능하도록 에러를 던지지 않음
      }
    } catch (error) {
      logger.error('❌ [Migration] Unexpected error during migration:', error);
      // 마이그레이션 실패가 앱 실행을 막지 않도록 에러를 던지지 않음
    }
  }
}
