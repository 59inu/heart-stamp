import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { decrypt } from './encryptionService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export interface Letter {
  id: string;
  userId: string;
  content: string;
  year: number;
  month: number;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export class LetterService {
  /**
   * 편지 생성
   */
  static async createLetter(
    userId: string,
    content: string,
    year: number,
    month: number
  ): Promise<Letter> {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO letters (id, "userId", content, year, month, "isRead", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, content, year, month, false, createdAt]
    );

    return result.rows[0];
  }

  /**
   * 사용자의 모든 편지 조회
   */
  static async getLettersByUserId(userId: string): Promise<Letter[]> {
    const result = await pool.query(
      `SELECT * FROM letters WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * 읽지 않은 편지 개수 조회
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) FROM letters WHERE "userId" = $1 AND "isRead" = false`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * 편지 읽음 처리
   */
  static async markAsRead(letterId: string): Promise<void> {
    const readAt = new Date().toISOString();

    await pool.query(
      `UPDATE letters SET "isRead" = true, "readAt" = $1 WHERE id = $2`,
      [readAt, letterId]
    );
  }

  /**
   * 특정 월의 일기 작성 횟수 조회
   */
  static async getDiaryCountByMonth(userId: string, year: number, month: number): Promise<number> {
    // 해당 월의 시작일과 종료일 계산
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT COUNT(*) FROM diaries
       WHERE "userId" = $1
       AND date >= $2
       AND date <= $3
       AND "deletedAt" IS NULL`,
      [userId, startDate, endDate]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * 모든 사용자의 해당 월 일기 작성 횟수 조회
   * (월말 편지 발송용)
   */
  static async getUsersWithDiaryCount(year: number, month: number, minCount: number = 5): Promise<Array<{ userId: string; count: number }>> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT "userId", COUNT(*) as count
       FROM diaries
       WHERE date >= $1
       AND date <= $2
       AND "deletedAt" IS NULL
       GROUP BY "userId"
       HAVING COUNT(*) >= $3`,
      [startDate, endDate, minCount]
    );

    return result.rows.map(row => ({
      userId: row.userId,
      count: parseInt(row.count)
    }));
  }

  /**
   * 특정 사용자의 해당 월 모든 일기 조회 (편지 생성용)
   */
  static async getUserDiariesByMonth(userId: string, year: number, month: number): Promise<Array<{ date: string; content: string; mood: string }>> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT date, content, mood
       FROM diaries
       WHERE "userId" = $1
       AND date >= $2
       AND date <= $3
       AND "deletedAt" IS NULL
       ORDER BY date ASC`,
      [userId, startDate, endDate]
    );

    // 암호화된 content를 복호화
    return result.rows.map(row => ({
      date: row.date,
      content: decrypt(row.content),
      mood: row.mood
    }));
  }

  /**
   * 오늘 새벽에 생성된 읽지 않은 편지 조회 (푸시 발송용)
   * 매월 1일 새벽 4시에 생성된 편지를 같은 날 아침 9시에 푸시
   */
  static async getTodaysUnreadLetters(): Promise<Letter[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const result = await pool.query(
      `SELECT * FROM letters
       WHERE "isRead" = false
       AND "createdAt" >= $1
       AND "createdAt" <= $2`,
      [todayStart.toISOString(), todayEnd.toISOString()]
    );

    return result.rows;
  }
}
