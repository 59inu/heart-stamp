import Database from 'better-sqlite3';
import path from 'path';
import { Report, MoodDistribution } from '../types/report';

const dbPath = path.join(__dirname, '../../diary.db');
const db = new Database(dbPath);

// WAL 모드 활성화 (성능 및 동시성 향상)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('busy_timeout = 5000');

// 리포트 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    _id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    period TEXT NOT NULL,
    year INTEGER NOT NULL,
    week INTEGER,
    month INTEGER,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    keywords TEXT NOT NULL,
    moodDistribution TEXT NOT NULL,
    summary TEXT NOT NULL,
    insight TEXT NOT NULL,
    diaryCount INTEGER NOT NULL,
    createdAt TEXT NOT NULL
  )
`);

// 인덱스 생성 (빠른 조회)
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_userId_period ON reports(userId, period)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_year_week ON reports(year, week)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_year_month ON reports(year, month)`);
  console.log('✅ Reports table and indexes created');
} catch (error) {
  // 인덱스가 이미 존재하면 무시
}

export class ReportDatabase {
  // 리포트 저장
  static create(report: Report): Report {
    const stmt = db.prepare(`
      INSERT INTO reports (_id, userId, period, year, week, month, startDate, endDate, keywords, moodDistribution, summary, insight, diaryCount, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
      report.createdAt
    );

    return report;
  }

  // 주간 리포트 조회
  static getWeeklyReport(userId: string, year: number, week: number): Report | null {
    const stmt = db.prepare(
      'SELECT * FROM reports WHERE userId = ? AND period = ? AND year = ? AND week = ?'
    );
    const row = stmt.get(userId, 'weekly', year, week) as any;

    if (!row) return null;

    return {
      ...row,
      keywords: JSON.parse(row.keywords),
      moodDistribution: JSON.parse(row.moodDistribution),
    };
  }

  // 월간 리포트 조회
  static getMonthlyReport(userId: string, year: number, month: number): Report | null {
    const stmt = db.prepare(
      'SELECT * FROM reports WHERE userId = ? AND period = ? AND year = ? AND month = ?'
    );
    const row = stmt.get(userId, 'monthly', year, month) as any;

    if (!row) return null;

    return {
      ...row,
      keywords: JSON.parse(row.keywords),
      moodDistribution: JSON.parse(row.moodDistribution),
    };
  }

  // 사용자의 모든 리포트 조회
  static getAllByUserId(userId: string): Report[] {
    const stmt = db.prepare(
      'SELECT * FROM reports WHERE userId = ? ORDER BY year DESC, week DESC, month DESC'
    );
    const rows = stmt.all(userId) as any[];

    return rows.map((row) => ({
      ...row,
      keywords: JSON.parse(row.keywords),
      moodDistribution: JSON.parse(row.moodDistribution),
    }));
  }

  // 리포트 삭제
  static delete(id: string): void {
    const stmt = db.prepare('DELETE FROM reports WHERE _id = ?');
    stmt.run(id);
  }
}
