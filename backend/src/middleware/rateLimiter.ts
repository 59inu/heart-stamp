import rateLimit from 'express-rate-limit';

// 일반 API: userId당 분당 60회
// userId가 없으면 IP 기반으로 폴백 (테스트/디버깅용)
export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // x-user-id 헤더 우선, 없으면 IP 폴백
    const userId = req.headers['x-user-id'];
    return userId ? String(userId) : req.ip || 'unknown';
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

// AI 분석: userId당 시간당 10회
export const aiAnalysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // x-user-id 헤더 우선, 없으면 IP 폴백
    const userId = req.headers['x-user-id'];
    return userId ? String(userId) : req.ip || 'unknown';
  },
  message: {
    success: false,
    message: 'AI analysis limit exceeded. Maximum 10 requests per hour.',
  },
});

// 관리 엔드포인트: IP당 분당 30회
export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin requests. Please try again later.',
  },
});
