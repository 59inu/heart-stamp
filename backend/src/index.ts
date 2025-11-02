import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { generalApiLimiter, adminLimiter } from './middleware/rateLimiter';
import { requireAdminToken } from './middleware/auth';
import diaryRoutes, { initializeClaudeService } from './routes/diaryRoutes';
import reportRoutes, { initializeReportService } from './routes/reportRoutes';
import imageRoutes from './routes/imageRoutes';
import { ClaudeService } from './services/claudeService';
import { AIAnalysisJob } from './jobs/aiAnalysisJob';
import { BackupJob } from './jobs/backupJob';
import { PushNotificationService } from './services/pushNotificationService';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 3000;

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['*'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Allow all origins in development or if * is specified
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`🚫 [CORS] Blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Middleware
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
app.post('/api/push/register', (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'userId and token are required',
      });
    }

    const { PushTokenDatabase } = require('./services/database');
    PushTokenDatabase.upsert(userId, token);

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.0.14:${PORT}`);
  console.log(`📔 Heart Stamp Backend - AI-powered diary comments`);
});
