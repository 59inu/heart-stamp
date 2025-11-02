import { Request, Response, NextFunction } from 'express';

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
