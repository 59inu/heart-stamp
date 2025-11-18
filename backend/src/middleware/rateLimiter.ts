import rateLimit from 'express-rate-limit';

// 일반 API: IP당 분당 60회
// 모바일 앱은 항상 x-user-id를 보내므로, IP 기반만으로 충분
export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

// AI 분석: IP당 시간당 10회
export const aiAnalysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
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
