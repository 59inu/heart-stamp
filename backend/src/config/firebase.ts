import admin from 'firebase-admin';
import path from 'path';

// Firebase Admin 초기화
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    console.log('✅ Firebase Admin이 이미 초기화되어 있습니다.');
    return;
  }

  try {
    let serviceAccount: any;

    // 방법 1: 환경 변수에서 JSON 직접 읽기 (Railway 권장 방식)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.log('📋 Firebase Service Account: 환경 변수에서 JSON 로드');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    }
    // 방법 2: 파일 경로에서 읽기 (로컬 개발)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      console.log('📋 Firebase Service Account: 파일에서 로드');
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      serviceAccount = require(path.resolve(serviceAccountPath));
    }
    // 둘 다 없으면 에러
    else {
      console.warn('⚠️ Firebase Service Account 설정이 없습니다.');
      console.warn('   - FIREBASE_SERVICE_ACCOUNT_JSON (환경 변수) 또는');
      console.warn('   - FIREBASE_SERVICE_ACCOUNT_PATH (파일 경로) 중 하나를 설정하세요.');

      // 개발 환경에서는 경고만 출력하고 계속 진행
      if (process.env.NODE_ENV === 'production') {
        throw new Error('프로덕션 환경에서는 Firebase Service Account가 필수입니다.');
      }
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('✅ Firebase Admin 초기화 완료:', serviceAccount.project_id);
  } catch (error) {
    console.error('❌ Firebase Admin 초기화 실패:', error);

    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.warn('⚠️ 개발 모드: Firebase 인증 없이 계속 실행됩니다.');
    }
  }
};

initializeFirebaseAdmin();

export default admin;
