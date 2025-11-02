import rateLimit from 'express-rate-limit';

// 일반 API: 사용자당 분당 60회
export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // X-User-Id 헤더 사용, 없으면 IP
    return (req.headers['x-user-id'] as string) || req.ip || 'unknown';
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

// AI 분석: 사용자당 시간당 10회
export const aiAnalysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.headers['x-user-id'] as string) || req.ip || 'unknown';
  },
  message: {
    success: false,
    message: 'AI analysis limit exceeded. Maximum 10 requests per hour.',
  },
});

// 관리 엔드포인트: IP당 분당 5회
export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin requests. Please try again later.',
  },
});
