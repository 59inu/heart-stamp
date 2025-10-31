import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import diaryRoutes, { initializeClaudeService } from './routes/diaryRoutes';
import { ClaudeService } from './services/claudeService';
import { AIAnalysisJob } from './jobs/aiAnalysisJob';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Stamp Diary Backend is running' });
});

// API Routes
app.use('/api', diaryRoutes);

// Initialize Claude Service
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!CLAUDE_API_KEY) {
  console.error('CLAUDE_API_KEY is not set in environment variables');
  process.exit(1);
}

initializeClaudeService(CLAUDE_API_KEY);
const claudeService = new ClaudeService(CLAUDE_API_KEY);

// Start AI Analysis Job
const aiAnalysisJob = new AIAnalysisJob(claudeService);
aiAnalysisJob.start();

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
