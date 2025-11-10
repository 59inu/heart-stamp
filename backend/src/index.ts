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
import diaryRoutes, { initializeClaudeService } from './routes/diaryRoutes';
import reportRoutes, { initializeReportService } from './routes/reportRoutes';
import imageRoutes from './routes/imageRoutes';
import { ClaudeService } from './services/claudeService';
import { AIAnalysisJob } from './jobs/aiAnalysisJob';
import { BackupJob } from './jobs/backupJob';
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
const claudeService = new ClaudeService(CLAUDE_API_KEY);

// Start AI Analysis Job
const aiAnalysisJob = new AIAnalysisJob(claudeService);
aiAnalysisJob.start();

// Start Backup Job
const backupJob = new BackupJob();
backupJob.start();

// 푸시 토큰 등록 API
app.post('/api/push/register', requireFirebaseAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'token is required',
      });
    }

    // req.userId는 requireFirebaseAuth에서 설정됨
    const userId = req.userId!;

    const { PushTokenDatabase } = require('./services/database');
    await PushTokenDatabase.upsert(userId, token);

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
    // req.userId는 requireFirebaseAuth에서 설정됨
    const userId = req.userId!;

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.0.14:${PORT}`);
  console.log(`📔 Heart Stamp Backend - AI-powered diary comments`);
});
