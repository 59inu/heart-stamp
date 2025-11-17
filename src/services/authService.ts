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

}
