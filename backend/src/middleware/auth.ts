import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';

// userId를 Request에 추가하기 위한 타입 확장
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Firebase Auth 미들웨어
 * Authorization: Bearer <token> 헤더를 검증하고 userId를 req에 추가
 */
export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const USE_FIREBASE_AUTH = process.env.USE_FIREBASE_AUTH === 'true';

  // 개발 모드: x-user-id 헤더 허용
  if (!USE_FIREBASE_AUTH) {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      console.warn(`🚫 [Dev Auth] Missing x-user-id header from ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'User ID required (dev mode)',
      });
    }
    req.userId = userId;
    return next();
  }

  // 프로덕션 모드: Firebase ID 토큰 검증
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`🚫 [Firebase Auth] Missing or invalid Authorization header from ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Bearer token required',
    });
  }

  const idToken = authHeader.substring(7); // "Bearer " 제거

  try {
    // Firebase ID 토큰 검증
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.userId = decodedToken.uid;

    console.log(`✅ [Firebase Auth] Authenticated user: ${decodedToken.uid}`);
    next();
  } catch (error: any) {
    console.error(`❌ [Firebase Auth] Token verification failed:`, error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}

/**
 * 관리자 토큰 검증 미들웨어
 * 관리용 엔드포인트 보호
 */
export function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const adminToken = req.headers['x-admin-token'] as string;
  const expectedToken = process.env.ADMIN_SECRET;

  // ADMIN_SECRET이 설정되지 않은 경우 경고
  if (!expectedToken) {
    console.warn('⚠️  ADMIN_SECRET not set in environment variables');
    return res.status(500).json({
      success: false,
      message: 'Admin authentication not configured',
    });
  }

  // 토큰 미제공
  if (!adminToken) {
    console.warn(`🚫 [Admin Auth] Missing admin token from ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'Admin token required',
    });
  }

  // 토큰 불일치
  if (adminToken !== expectedToken) {
    console.warn(`🚫 [Admin Auth] Invalid admin token from ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'Invalid admin token',
    });
  }

  // 인증 성공
  console.log(`✅ [Admin Auth] Authenticated admin request from ${req.ip}`);
  next();
}
