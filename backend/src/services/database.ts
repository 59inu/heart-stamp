import Database from 'better-sqlite3';
import path from 'path';
import { DiaryEntry } from '../types/diary';

const dbPath = path.join(__dirname, '../../diary.db');
const db = new Database(dbPath);

// WAL 모드 활성화 (성능 및 동시성 향상)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL'); // WAL과 함께 사용 시 안전하면서도 빠름
db.pragma('cache_size = -64000'); // 64MB 캐시 (성능 향상)
db.pragma('busy_timeout = 5000'); // 5초 대기 후 타임아웃
console.log('✅ WAL mode enabled for better-sqlite3');

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

// 마이그레이션: deleted_at 컬럼 추가 (소프트 삭제 지원)
try {
  db.exec(`ALTER TABLE diaries ADD COLUMN deletedAt TEXT`);
  console.log('✅ Added deletedAt column to diaries table');
} catch (error) {
  // 컬럼이 이미 존재하면 무시
}

// 마이그레이션: version 컬럼 추가 (충돌 해결 지원)
try {
  db.exec(`ALTER TABLE diaries ADD COLUMN version INTEGER DEFAULT 1`);
  console.log('✅ Added version column to diaries table');
} catch (error) {
  // 컬럼이 이미 존재하면 무시
}

// userId 인덱스 생성 (성능 향상)
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_userId ON diaries(userId)`);
  console.log('✅ Created userId index');
} catch (error) {
  // 인덱스가 이미 존재하면 무시
}

// deletedAt 인덱스 생성 (소프트 삭제 쿼리 성능 향상)
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_deletedAt ON diaries(deletedAt)`);
  console.log('✅ Created deletedAt index on diaries table');
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

// 마이그레이션: push_tokens에 deletedAt 컬럼 추가
try {
  db.exec(`ALTER TABLE push_tokens ADD COLUMN deletedAt TEXT`);
  console.log('✅ Added deletedAt column to push_tokens table');
} catch (error) {
  // 컬럼이 이미 존재하면 무시
}

// 마이그레이션: push_tokens에 version 컬럼 추가
try {
  db.exec(`ALTER TABLE push_tokens ADD COLUMN version INTEGER DEFAULT 1`);
  console.log('✅ Added version column to push_tokens table');
} catch (error) {
  // 컬럼이 이미 존재하면 무시
}

console.log('✅ SQLite database initialized');

export class DiaryDatabase {
  // 일기 저장
  static create(diary: DiaryEntry): DiaryEntry {
    const stmt = db.prepare(`
      INSERT INTO diaries (_id, userId, date, content, weather, mood, moodTag, aiComment, stampType, createdAt, updatedAt, syncedWithServer, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      diary.syncedWithServer ? 1 : 0,
      diary.version || 1 // 초기 버전은 1
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

    // 버전 증가 (Last-Write-Wins 충돌 해결)
    fields.push('version = version + 1');

    values.push(id);

    const stmt = db.prepare(`
      UPDATE diaries
      SET ${fields.join(', ')}
      WHERE _id = ? AND deletedAt IS NULL
    `);

    stmt.run(...values);
  }

  // 일기 조회 (ID)
  static getById(id: string): DiaryEntry | null {
    const stmt = db.prepare('SELECT * FROM diaries WHERE _id = ? AND deletedAt IS NULL');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      syncedWithServer: row.syncedWithServer === 1,
    };
  }

  // 특정 사용자의 모든 일기 조회
  static getAllByUserId(userId: string): DiaryEntry[] {
    const stmt = db.prepare('SELECT * FROM diaries WHERE userId = ? AND deletedAt IS NULL ORDER BY date DESC');
    const rows = stmt.all(userId) as any[];

    return rows.map(row => ({
      ...row,
      syncedWithServer: row.syncedWithServer === 1,
    }));
  }

  // 모든 일기 조회 (관리용)
  static getAll(): DiaryEntry[] {
    const stmt = db.prepare('SELECT * FROM diaries WHERE deletedAt IS NULL ORDER BY date DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      syncedWithServer: row.syncedWithServer === 1,
    }));
  }

  // AI 코멘트 없는 일기 조회 (전날 작성된 일기만)
  // 배치 작업이 새벽에 실행되므로, 전날 작성된 일기에 코멘트를 달아야 함
  static getPending(): DiaryEntry[] {
    // 어제 날짜 계산 (로컬 타임존 기준)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${year}-${month}-${day}`; // "2025-11-02"

    console.log(`📅 [DiaryDatabase] 배치 작업 대상 날짜: ${yesterdayStr}`);

    // 어제 날짜(00:00:00 ~ 23:59:59)에 작성된 일기 중 AI 코멘트 없는 것만 조회 (소프트 삭제 제외)
    const stmt = db.prepare('SELECT * FROM diaries WHERE aiComment IS NULL AND date LIKE ? AND deletedAt IS NULL ORDER BY date DESC');
    const rows = stmt.all(`${yesterdayStr}%`) as any[];

    console.log(`📋 [DiaryDatabase] ${yesterdayStr} 날짜 일기 중 AI 코멘트 대기: ${rows.length}개`);

    return rows.map(row => ({
      ...row,
      syncedWithServer: row.syncedWithServer === 1,
    }));
  }

  // 일기 삭제 (소프트 삭제)
  static delete(id: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE diaries
      SET deletedAt = ?, updatedAt = ?, version = version + 1
      WHERE _id = ? AND deletedAt IS NULL
    `);
    stmt.run(now, now, id);
  }

  // 어제 날짜 일기 중 AI 코멘트가 있는 사용자 목록 조회 (중복 제거)
  static getUsersWithAICommentYesterday(): string[] {
    // 어제 날짜 계산 (로컬 타임존 기준)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${year}-${month}-${day}`; // "2025-11-02"

    console.log(`📅 [DiaryDatabase] 알림 대상자 조회: ${yesterdayStr} 날짜 일기`);

    // 어제 날짜에 작성되고 AI 코멘트가 있는 일기의 userId 조회 (중복 제거, 소프트 삭제 제외)
    const stmt = db.prepare('SELECT DISTINCT userId FROM diaries WHERE date LIKE ? AND aiComment IS NOT NULL AND deletedAt IS NULL');
    const rows = stmt.all(`${yesterdayStr}%`) as Array<{ userId: string }>;

    const userIds = rows.map(row => row.userId);
    console.log(`👥 [DiaryDatabase] ${yesterdayStr} 일기 AI 코멘트 받은 사용자: ${userIds.length}명`);

    return userIds;
  }
}

export class PushTokenDatabase {
  // Push Token 저장/업데이트
  static upsert(userId: string, token: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO push_tokens (userId, token, createdAt, updatedAt, version)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(userId) DO UPDATE SET
        token = excluded.token,
        updatedAt = excluded.updatedAt,
        version = version + 1,
        deletedAt = NULL
    `);
    stmt.run(userId, token, now, now);
  }

  // Push Token 조회
  static get(userId: string): string | null {
    const stmt = db.prepare('SELECT token FROM push_tokens WHERE userId = ? AND deletedAt IS NULL');
    const row = stmt.get(userId) as any;
    return row ? row.token : null;
  }

  // 모든 Push Token 조회
  static getAll(): Array<{ userId: string; token: string }> {
    const stmt = db.prepare('SELECT userId, token FROM push_tokens WHERE deletedAt IS NULL');
    return stmt.all() as Array<{ userId: string; token: string }>;
  }

  // Push Token 삭제 (소프트 삭제)
  static delete(userId: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE push_tokens
      SET deletedAt = ?, updatedAt = ?, version = version + 1
      WHERE userId = ? AND deletedAt IS NULL
    `);
    stmt.run(now, now, userId);
  }
}

export default db;
