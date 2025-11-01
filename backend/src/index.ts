import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import diaryRoutes, { initializeClaudeService } from './routes/diaryRoutes';
import reportRoutes, { initializeReportService } from './routes/reportRoutes';
import imageRoutes from './routes/imageRoutes';
import { ClaudeService } from './services/claudeService';
import { AIAnalysisJob } from './jobs/aiAnalysisJob';
import { PushNotificationService } from './services/pushNotificationService';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 정적 파일 서빙: /uploads 폴더의 이미지 파일 제공
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Stamp Diary Backend is running' });
});

// API Routes
app.use('/api', diaryRoutes);
app.use('/api', reportRoutes);
app.use('/api', imageRoutes);

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

// Initialize Push Notification Service
const pushNotificationService = new PushNotificationService();

// Start AI Analysis Job
const aiAnalysisJob = new AIAnalysisJob(claudeService, pushNotificationService);
aiAnalysisJob.start();

// 푸시 토큰 등록 API
app.post('/api/push/register', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    const success = pushNotificationService.registerToken(token);
    if (success) {
      res.json({
        success: true,
        message: 'Push token registered successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid push token',
      });
    }
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token',
    });
  }
});

// Manual trigger endpoint for testing
app.post('/api/jobs/trigger-analysis', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📔 Stamp Diary Backend - AI-powered diary comments`);
});
