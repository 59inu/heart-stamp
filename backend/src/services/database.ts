import Database from 'better-sqlite3';
import path from 'path';
import { DiaryEntry } from '../types/diary';

const dbPath = path.join(__dirname, '../../diary.db');
const db = new Database(dbPath);

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS diaries (
    _id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    weather TEXT,
    mood TEXT,
    moodTag TEXT,
    aiComment TEXT,
    stampType TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    syncedWithServer INTEGER DEFAULT 0
  )
`);

// 마이그레이션: 기존 테이블에 컬럼 추가 (이미 존재하면 무시)
try {
  db.exec(`ALTER TABLE diaries ADD COLUMN userId TEXT NOT NULL DEFAULT 'unknown'`);
  console.log('✅ Added userId column to existing database');
} catch (error) {
  // 컬럼이 이미 존재하면 에러 발생 (무시)
}

try {
  db.exec(`ALTER TABLE diaries ADD COLUMN weather TEXT`);
  console.log('✅ Added weather column to existing database');
} catch (error) {
  // 컬럼이 이미 존재하면 에러 발생 (무시)
}

try {
  db.exec(`ALTER TABLE diaries ADD COLUMN mood TEXT`);
  console.log('✅ Added mood column to existing database');
} catch (error) {
  // 컬럼이 이미 존재하면 에러 발생 (무시)
}

try {
  db.exec(`ALTER TABLE diaries ADD COLUMN moodTag TEXT`);
  console.log('✅ Added moodTag column to existing database');
} catch (error) {
  // 컬럼이 이미 존재하면 에러 발생 (무시)
}

// userId 인덱스 생성 (성능 향상)
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_userId ON diaries(userId)`);
  console.log('✅ Created userId index');
} catch (error) {
  // 인덱스가 이미 존재하면 무시
}

// Push Token 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS push_tokens (
    userId TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

console.log('✅ SQLite database initialized');

export class DiaryDatabase {
  // 일기 저장
  static create(diary: DiaryEntry): DiaryEntry {
    const stmt = db.prepare(`
      INSERT INTO diaries (_id, userId, date, content, weather, mood, moodTag, aiComment, stampType, createdAt, updatedAt, syncedWithServer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      diary._id,
      diary.userId || 'unknown',
      diary.date,
      diary.content,
      diary.weather || null,
      diary.mood || null,
      diary.moodTag || null,
      diary.aiComment || null,
      diary.stampType || null,
      diary.createdAt,
      diary.updatedAt,
      diary.syncedWithServer ? 1 : 0
    );

    return diary;
  }

  // 일기 업데이트
  static update(id: string, updates: Partial<DiaryEntry>): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.weather !== undefined) {
      fields.push('weather = ?');
      values.push(updates.weather);
    }
    if (updates.mood !== undefined) {
      fields.push('mood = ?');
      values.push(updates.mood);
    }
    if (updates.moodTag !== undefined) {
      fields.push('moodTag = ?');
      values.push(updates.moodTag);
    }
    if (updates.aiComment !== undefined) {
      fields.push('aiComment = ?');
      values.push(updates.aiComment);
    }
    if (updates.stampType !== undefined) {
      fields.push('stampType = ?');
      values.push(updates.stampType);
    }
    if (updates.syncedWithServer !== undefined) {
      fields.push('syncedWithServer = ?');
      values.push(updates.syncedWithServer ? 1 : 0);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());

    values.push(id);

    const stmt = db.prepare(`
      UPDATE diaries
      SET ${fields.join(', ')}
      WHERE _id = ?
    `);

    stmt.run(...values);
  }

  // 일기 조회 (ID)
  static getById(id: string): DiaryEntry | null {
    const stmt = db.prepare('SELECT * FROM diaries WHERE _id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      syncedWithServer: row.syncedWithServer === 1,
    };
  }

  // 특정 사용자의 모든 일기 조회
  static getAllByUserId(userId: string): DiaryEntry[] {
    const stmt = db.prepare('SELECT * FROM diaries WHERE userId = ? ORDER BY date DESC');
    const rows = stmt.all(userId) as any[];

    return rows.map(row => ({
      ...row,
      syncedWithServer: row.syncedWithServer === 1,
    }));
  }

  // 모든 일기 조회 (관리용)
  static getAll(): DiaryEntry[] {
    const stmt = db.prepare('SELECT * FROM diaries ORDER BY date DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      syncedWithServer: row.syncedWithServer === 1,
    }));
  }

  // AI 코멘트 없는 일기 조회 (전날 작성된 일기만)
  // 배치 작업이 새벽에 실행되므로, 전날 작성된 일기에 코멘트를 달아야 함
  static getPending(): DiaryEntry[] {
    // 테스트: 모든 AI 코멘트 없는 일기 조회
    const stmt = db.prepare('SELECT * FROM diaries WHERE aiComment IS NULL ORDER BY date DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      syncedWithServer: row.syncedWithServer === 1,
    }));
  }

  // 일기 삭제
  static delete(id: string): void {
    const stmt = db.prepare('DELETE FROM diaries WHERE _id = ?');
    stmt.run(id);
  }
}

export class PushTokenDatabase {
  // Push Token 저장/업데이트
  static upsert(userId: string, token: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO push_tokens (userId, token, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        token = excluded.token,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(userId, token, now, now);
  }

  // Push Token 조회
  static get(userId: string): string | null {
    const stmt = db.prepare('SELECT token FROM push_tokens WHERE userId = ?');
    const row = stmt.get(userId) as any;
    return row ? row.token : null;
  }

  // 모든 Push Token 조회
  static getAll(): Array<{ userId: string; token: string }> {
    const stmt = db.prepare('SELECT userId, token FROM push_tokens');
    return stmt.all() as Array<{ userId: string; token: string }>;
  }

  // Push Token 삭제
  static delete(userId: string): void {
    const stmt = db.prepare('DELETE FROM push_tokens WHERE userId = ?');
    stmt.run(userId);
  }
}

export default db;
