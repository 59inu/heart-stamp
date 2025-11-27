// Load environment variables FIRST (before any other imports)
import dotenv from 'dotenv';
dotenv.config();

// Validate environment variables immediately after loading
import { validateEnvironment, printEnvironmentInfo } from './utils/envValidator';
validateEnvironment();
printEnvironmentInfo();

import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { generalApiLimiter, adminLimiter } from './middleware/rateLimiter';
import { requireFirebaseAuth, requireAdminToken } from './middleware/auth';
import diaryRoutes, { initializeClaudeService, initializeImageGenerationService } from './routes/diaryRoutes';
import reportRoutes, { initializeReportService } from './routes/reportRoutes';
import imageRoutes from './routes/imageRoutes';
import exportRoutes from './routes/exportRoutes';
import nanobananaRoutes from './routes/nanobananaRoutes';
import imageGenerationRoutes from './routes/imageGenerationRoutes';
import letterRoutes from './routes/letterRoutes';
import adminRoutes, { initializeAdminClaudeService } from './routes/adminRoutes';
import { ClaudeService } from './services/claudeService';
import { AIAnalysisJob } from './jobs/aiAnalysisJob';
import { BackupJob } from './jobs/backupJob';
import { ExportJob } from './jobs/exportJob';
import { LetterJob } from './jobs/letterJob';
import { PushNotificationService } from './services/pushNotificationService';
import { initialize as initializeEncryption } from './services/encryptionService';

const app: Application = express();
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 3000;

// CORS Configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['*'];

// Enforce stricter CORS in production
if (IS_PRODUCTION && allowedOrigins.includes('*')) {
  console.error('❌ CORS wildcard (*) is not allowed in production');
  console.error('   Please set ALLOWED_ORIGINS environment variable');
  throw new Error('CORS misconfiguration in production');
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Allow all origins in development only
    if (!IS_PRODUCTION && allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`🚫 [CORS] Blocked request from origin: ${origin}`);
    console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Middleware
// Trust proxy for Railway (리버스 프록시 환경)
app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use(express.json());

// 모든 요청 로깅
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`   Headers:`, req.headers);
  console.log(`   Body:`, req.body);
  next();
});

// 정적 파일 서빙: /uploads 폴더의 이미지 파일 제공
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (레이트리미트 없음)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Heart Stamp Backend is running' });
});

// API Routes (일반 레이트리미트 적용)
app.use('/api', generalApiLimiter, diaryRoutes);
app.use('/api', generalApiLimiter, reportRoutes);
app.use('/api', generalApiLimiter, imageRoutes);
app.use('/api', generalApiLimiter, exportRoutes);
app.use('/api', generalApiLimiter, imageGenerationRoutes);
app.use('/api/letters', generalApiLimiter, letterRoutes);

// Admin Routes (adminLimiter 적용, 인증은 라우터 내부에서 처리)
app.use('/api/admin', adminLimiter, adminRoutes);

// Nanobanana callback (레이트리미트 없음 - 외부 API 호출)
app.use('/api', nanobananaRoutes);

// Initialize Encryption Service FIRST
initializeEncryption();

// Initialize Claude Service
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'mock-api-key-for-testing';

if (!process.env.CLAUDE_API_KEY) {
  console.log('⚠️  CLAUDE_API_KEY not set - using MOCK mode for testing');
} else {
  console.log('✅ CLAUDE_API_KEY found - using real API');
}

initializeClaudeService(CLAUDE_API_KEY);
initializeReportService(CLAUDE_API_KEY);
initializeAdminClaudeService(CLAUDE_API_KEY);
const claudeService = new ClaudeService(CLAUDE_API_KEY);

// Initialize Image Generation Service
const NANOBANANA_API_KEY = process.env.NANOBANANA_API_KEY;
const NANOBANANA_REFERENCE_IMAGE_URLS = process.env.NANOBANANA_REFERENCE_IMAGE_URLS;
const NANOBANANA_CALLBACK_URL = process.env.NANOBANANA_CALLBACK_URL;
if (NANOBANANA_API_KEY) {
  const referenceImageUrls = NANOBANANA_REFERENCE_IMAGE_URLS
    ? NANOBANANA_REFERENCE_IMAGE_URLS.split(',').map(url => url.trim()).filter(url => url)
    : [];

  initializeImageGenerationService(CLAUDE_API_KEY, NANOBANANA_API_KEY, referenceImageUrls, NANOBANANA_CALLBACK_URL);
  console.log('✅ Image Generation Service enabled');
  if (referenceImageUrls.length > 0) {
    console.log(`🖼️  Reference images (${referenceImageUrls.length}):`, referenceImageUrls);
  } else {
    console.log('⚠️  No reference image URLs configured');
  }
} else {
  console.log('⚠️  NANOBANANA_API_KEY not set - Image generation disabled');
}

// AI Analysis Job (관리 API에서 수동 트리거용)
const aiAnalysisJob = new AIAnalysisJob(claudeService);

// Backup Job (관리 API에서 수동 트리거용)
const backupJob = new BackupJob();

// Letter Job (관리 API에서 수동 트리거용)
LetterJob.initialize(claudeService);

// Export Job
ExportJob.start();
ExportJob.startCleanup();

// 푸시 토큰 등록 API
app.post('/api/push/register', requireFirebaseAuth, async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'userId and token are required',
      });
    }

    // 클라이언트가 보낸 userId 사용 (로컬 UUID)
    // Firebase 인증은 보안을 위해 유지하지만, userId는 클라이언트 제공 값 사용
    const { PushTokenDatabase, NotificationPreferencesDatabase } = require('./services/database');
    await PushTokenDatabase.upsert(userId, token);

    // ✅ 하위 호환성: preference도 자동 생성 (구 버전 앱 대응)
    // 이미 있으면 유지, 없으면 기본값(활성화)으로 생성
    await NotificationPreferencesDatabase.upsert(userId, {
      teacherCommentEnabled: true,
      dailyReminderEnabled: true
    });

    res.json({
      success: true,
      message: 'Push token registered successfully',
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token',
    });
  }
});

// 푸시 토큰 삭제 API (알림 끄기)
app.delete('/api/push/unregister', requireFirebaseAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // 클라이언트가 보낸 userId 사용 (로컬 UUID)
    const { PushTokenDatabase } = require('./services/database');
    await PushTokenDatabase.delete(userId);

    res.json({
      success: true,
      message: 'Push token unregistered successfully',
    });
  } catch (error) {
    console.error('Error unregistering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister push token',
    });
  }
});

// GET: 알림 설정 조회
app.get('/api/notification-preferences', requireFirebaseAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const { NotificationPreferencesDatabase } = require('./services/database');
    const preferences = await NotificationPreferencesDatabase.get(userId as string);

    res.json({
      success: true,
      data: preferences || {
        teacherCommentEnabled: true,  // 기본값
        dailyReminderEnabled: true
      }
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
    });
  }
});

// PUT: 알림 설정 업데이트
app.put('/api/notification-preferences', requireFirebaseAuth, async (req, res) => {
  try {
    const { userId, teacherCommentEnabled, dailyReminderEnabled, marketingEnabled } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const { NotificationPreferencesDatabase } = require('./services/database');
    await NotificationPreferencesDatabase.upsert(userId, {
      teacherCommentEnabled,
      dailyReminderEnabled,
      marketingEnabled
    });

    console.log(`✅ [NotificationPreferences] Updated for user ${userId}:`, {
      teacherCommentEnabled,
      dailyReminderEnabled,
      marketingEnabled
    });

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
    });
  }
});

// Manual trigger endpoint for testing (관리 리미터 + 토큰 인증)
app.post('/api/jobs/trigger-analysis', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    await aiAnalysisJob.triggerManually();
    res.json({
      success: true,
      message: 'Batch analysis triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering batch analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger batch analysis',
    });
  }
});

// 어제 일기의 AI 코멘트 초기화 (재생성용 - 관리 리미터 + 토큰 인증)
app.post('/api/admin/reset-yesterday-comments', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    const { DiaryDatabase } = require('./services/database');
    const count = await DiaryDatabase.resetYesterdayComments();

    res.json({
      success: true,
      message: `Reset ${count} diary comments`,
      count: count,
    });
  } catch (error) {
    console.error('Error resetting comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset comments',
    });
  }
});

// Manual backup trigger endpoint (관리 리미터 + 토큰 인증)
app.post('/api/jobs/trigger-backup', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    await backupJob.triggerManually();
    res.json({
      success: true,
      message: 'Backup triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger backup',
    });
  }
});

// Manual letter generation trigger endpoint (관리 리미터 + 토큰 인증)
app.post('/api/jobs/trigger-letters', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    const { year, month } = req.body;

    if (year && month) {
      console.log(`🧪 [TEST] Manually triggering monthly letter generation for ${year}-${month}...`);
      await LetterJob.generateMonthlyLetters(year, month);
    } else {
      console.log('🧪 [TEST] Manually triggering monthly letter generation (previous month)...');
      await LetterJob.generateMonthlyLetters();
    }

    res.json({
      success: true,
      message: 'Monthly letter generation triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering letter generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger letter generation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Manual letter notification trigger endpoint (관리 리미터 + 토큰 인증)
app.post('/api/jobs/trigger-letter-notifications', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    console.log('🧪 [TEST] Manually triggering letter notifications...');
    await LetterJob.sendLetterNotifications();
    res.json({
      success: true,
      message: 'Letter notifications triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering letter notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger letter notifications',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PostgreSQL 데이터 전체 백업 (임시 엔드포인트)
app.get('/api/admin/export-all-sqlite-data', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    const { DiaryDatabase, PushTokenDatabase } = require('./services/database');
    const { ReportDatabase } = require('./services/reportDatabase');
    const { ExportJobDatabase } = require('./services/exportDatabase');

    console.log('📦 [SQLite Export] Starting full data export...');

    // 모든 데이터 조회
    const diaries = await DiaryDatabase.getAll();
    const pushTokens = await PushTokenDatabase.getAll();

    // 사용자 ID 목록 추출
    const userIds = [...new Set(diaries.map((d: any) => d.userId))];

    // 각 사용자의 리포트 조회
    const allReports = [];
    for (const userId of userIds) {
      const reports = await ReportDatabase.getAllByUserId(userId);
      allReports.push(...reports);
    }

    // 모든 export job 조회
    const allExportJobs = [];
    for (const userId of userIds) {
      const jobs = await ExportJobDatabase.getAllForUser(userId);
      allExportJobs.push(...jobs);
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: {
        totalDiaries: diaries.length,
        totalUsers: userIds.length,
        totalReports: allReports.length,
        totalPushTokens: pushTokens.length,
        totalExportJobs: allExportJobs.length,
      },
      data: {
        diaries,
        reports: allReports,
        pushTokens,
        exportJobs: allExportJobs,
      },
    };

    console.log('✅ [SQLite Export] Export completed:', exportData.stats);

    res.json({
      success: true,
      ...exportData,
    });
  } catch (error) {
    console.error('❌ [SQLite Export] Export failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export SQLite data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// List backups endpoint (관리 리미터 + 토큰 인증)
app.get('/api/jobs/backups', adminLimiter, requireAdminToken, (req, res) => {
  try {
    const { BackupService } = require('./services/backupService');
    const backups = BackupService.listBackups();
    res.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
    });
  }
});

// 일반 Push 테스트 엔드포인트 (관리 리미터 + 토큰 인증)
app.post('/api/push/test-regular', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    console.log('🧪 [TEST] Sending regular push to all users...');
    await PushNotificationService.sendNotificationToAll(
      '테스트 알림 📱',
      '앱이 알림을 정상적으로 수신하고 있는지 확인 중입니다',
      { type: 'test' }
    );
    res.json({
      success: true,
      message: 'Regular push sent to all users',
    });
  } catch (error) {
    console.error('Error sending regular push:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send regular push',
    });
  }
});

// AI 코멘트 완료 알림 테스트 엔드포인트 (관리 리미터 + 토큰 인증)
app.post('/api/push/test-ai-comment', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    console.log('🧪 [TEST] Sending AI comment complete notification...');
    await PushNotificationService.sendNotificationToAll(
      '선생님 코멘트 도착 ✨',
      '밤 사이 선생님이 일기를 읽고 코멘트를 남겼어요',
      { type: 'ai_comment_complete' }
    );
    res.json({
      success: true,
      message: 'AI comment notification sent to all users',
    });
  } catch (error) {
    console.error('Error sending AI comment notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send AI comment notification',
    });
  }
});

// Push Notification Receipt 확인 엔드포인트 (관리 리미터 + 토큰 인증)
app.post('/api/push/check-receipts', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    console.log('🔍 [ADMIN] Manually checking push notification receipts...');
    await PushNotificationService.checkReceipts();
    const stats = PushNotificationService.getTicketStats();
    res.json({
      success: true,
      message: 'Receipt check completed',
      data: stats,
    });
  } catch (error) {
    console.error('Error checking receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check receipts',
    });
  }
});

// Push Notification Ticket 통계 조회 (관리 리미터 + 토큰 인증)
app.get('/api/push/ticket-stats', adminLimiter, requireAdminToken, (req, res) => {
  try {
    const stats = PushNotificationService.getTicketStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ticket stats',
    });
  }
});

// 특정 유저에게 푸시 알림 전송 (관리 리미터 + 토큰 인증)
app.post('/api/admin/push/send-to-user', adminLimiter, requireAdminToken, async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'userId, title, and body are required',
      });
    }

    console.log(`📤 [ADMIN] Sending push to user ${userId}: ${title}`);
    const success = await PushNotificationService.sendNotification(userId, title, body);

    if (success) {
      res.json({
        success: true,
        message: 'Push notification sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send push notification (user may not have a valid token)',
      });
    }
  } catch (error) {
    console.error('Error sending push to user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send push notification',
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.0.14:${PORT}`);
  console.log(`📔 Heart Stamp Backend - AI-powered diary comments`);
});
