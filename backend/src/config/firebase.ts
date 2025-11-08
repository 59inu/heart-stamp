import admin from 'firebase-admin';
import path from 'path';

// Firebase Admin 초기화
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    console.log('✅ Firebase Admin이 이미 초기화되어 있습니다.');
    return;
  }

  try {
    // 환경 변수에서 서비스 계정 키 파일 경로 읽기
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (!serviceAccountPath) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH 환경 변수가 설정되지 않았습니다.');
      console.warn('⚠️ Firebase 인증이 비활성화됩니다. (개발 모드에서만 허용)');

      // 개발 환경에서는 경고만 출력하고 계속 진행
      if (process.env.NODE_ENV === 'production') {
        throw new Error('프로덕션 환경에서는 FIREBASE_SERVICE_ACCOUNT_PATH가 필수입니다.');
      }
      return;
    }

    const serviceAccount = require(path.resolve(serviceAccountPath));

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
