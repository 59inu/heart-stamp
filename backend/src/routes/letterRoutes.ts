import { Router, Request, Response } from 'express';
import { LetterService } from '../services/letterService';

const router = Router();

/**
 * 사용자의 모든 편지 조회
 * GET /api/letters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const letters = await LetterService.getLettersByUserId(userId);

    res.json({ letters });
  } catch (error) {
    console.error('Error fetching letters:', error);
    res.status(500).json({ error: 'Failed to fetch letters' });
  }
});

/**
 * 읽지 않은 편지 개수 조회
 * GET /api/letters/unread-count
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const unreadCount = await LetterService.getUnreadCount(userId);

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * 편지 읽음 처리
 * POST /api/letters/:id/read
 */
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Letter ID is required' });
    }

    await LetterService.markAsRead(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking letter as read:', error);
    res.status(500).json({ error: 'Failed to mark letter as read' });
  }
});

export default router;
