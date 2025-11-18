import { Pool } from 'pg';
import { Report, MoodDistribution } from '../types/report';

// PostgreSQL connection pool (database.ts와 동일한 pool 사용)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 리포트 테이블 생성
async function initializeReportsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        _id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        period TEXT NOT NULL,
        year INTEGER NOT NULL,
        week INTEGER,
        month INTEGER,
        "startDate" TEXT NOT NULL,
        "endDate" TEXT NOT NULL,
        keywords TEXT NOT NULL,
        "moodDistribution" TEXT NOT NULL,
        summary TEXT NOT NULL,
        insight TEXT NOT NULL,
        "diaryCount" INTEGER NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT,
        "deletedAt" TEXT,
        version INTEGER DEFAULT 1
      )
    `);

    // 인덱스 생성 (빠른 조회)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_userId_period ON reports("userId", period)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_year_week ON reports(year, week)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_year_month ON reports(year, month)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deletedAt ON reports("deletedAt")`);

    console.log('✅ Reports table and indexes created');
  } catch (error) {
    console.error('❌ Error creating reports table:', error);
  }
}

// 초기화 실행
initializeReportsTable();

export class ReportDatabase {
  // 리포트 저장
  static async create(report: Report): Promise<Report> {
    const now = new Date().toISOString();

    await pool.query(`
      INSERT INTO reports (_id, "userId", period, year, week, month, "startDate", "endDate", keywords, "moodDistribution", summary, insight, "diaryCount", "createdAt", "updatedAt", version)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      report._id,
      report.userId,
      report.period,
      report.year,
      report.week || null,
      report.month || null,
      report.startDate,
      report.endDate,
      JSON.stringify(report.keywords),
      JSON.stringify(report.moodDistribution),
      report.summary,
      report.insight,
      report.diaryCount,
      report.createdAt,
      report.updatedAt || now,
      report.version || 1
    ]);

    return report;
  }

  // 주간 리포트 조회 (최신 리포트 반환)
  static async getWeeklyReport(userId: string, year: number, week: number): Promise<Report | null> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE "userId" = $1 AND period = $2 AND year = $3 AND week = $4 AND "deletedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 1',
      [userId, 'weekly', year, week]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      keywords: JSON.parse(row.keywords),
      moodDistribution: JSON.parse(row.moodDistribution),
    };
  }

  // 월간 리포트 조회 (최신 리포트 반환)
  static async getMonthlyReport(userId: string, year: number, month: number): Promise<Report | null> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE "userId" = $1 AND period = $2 AND year = $3 AND month = $4 AND "deletedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 1',
      [userId, 'monthly', year, month]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      keywords: JSON.parse(row.keywords),
      moodDistribution: JSON.parse(row.moodDistribution),
    };
  }

  // 사용자의 모든 리포트 조회
  static async getAllByUserId(userId: string): Promise<Report[]> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE "userId" = $1 AND "deletedAt" IS NULL ORDER BY year DESC, week DESC, month DESC',
      [userId]
    );

    return result.rows.map((row) => ({
      ...row,
      keywords: JSON.parse(row.keywords),
      moodDistribution: JSON.parse(row.moodDistribution),
    }));
  }

  // 리포트 삭제 (소프트 삭제)
  static async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await pool.query(`
      UPDATE reports
      SET "deletedAt" = $1, "updatedAt" = $2, version = version + 1
      WHERE _id = $3 AND "deletedAt" IS NULL
    `, [now, now, id]);
  }
}
