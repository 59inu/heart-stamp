import Database from 'better-sqlite3';
import path from 'path';
import { DiaryEntry } from '../types/diary';
import {
  DatabaseError,
  DuplicateKeyError,
  DiskFullError,
  DatabaseLockError,
  DatabaseCorruptError,
} from '../utils/errors';
import { sleep } from '../utils/retry';
import { encryptFields, decryptFields } from './encryptionService';

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

// 마이그레이션: model 컬럼 추가 (AI 모델 추적용)
try {
  db.exec(`ALTER TABLE diaries ADD COLUMN model TEXT`);
  console.log('✅ Added model column to diaries table');
} catch (error) {
  // 컬럼이 이미 존재하면 무시
}

// 마이그레이션: importanceScore 컬럼 추가 (중요도 점수 추적용)
try {
  db.exec(`ALTER TABLE diaries ADD COLUMN importanceScore INTEGER`);
  console.log('✅ Added importanceScore column to diaries table');
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
  /**
   * SQLite 에러 처리
   */
  private static handleDatabaseError(error: any, operation: string): never {
    const err = error as any;

    // SQLite 에러 코드별 처리
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new DuplicateKeyError(
        `Duplicate entry in ${operation}`,
        { originalError: err.message }
      );
    }

    if (err.code === 'SQLITE_FULL') {
      throw new DiskFullError(
        'Database disk is full',
        { originalError: err.message }
      );
    }

    if (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') {
      throw new DatabaseLockError(
        'Database is locked or busy',
        { originalError: err.message }
      );
    }

    if (err.code === 'SQLITE_CORRUPT' || err.code === 'SQLITE_NOTADB') {
      throw new DatabaseCorruptError(
        'Database file is corrupted',
        { originalError: err.message }
      );
    }

    // 기타 SQLite 에러
    throw new DatabaseError(
      `Database error in ${operation}: ${err.message}`,
      err.code,
      { originalError: err.message }
    );
  }

  /**
   * SQLITE_BUSY 재시도 로직
   */
  private static async retryOnBusy<T>(
    fn: () => T,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return fn();
      } catch (error: any) {
        if (
          (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') &&
          attempt < maxRetries
        ) {
          const delay = 100 * (attempt + 1); // 100ms, 200ms, 300ms
          console.warn(`⚠️  Database busy, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw new DatabaseLockError('Database busy timeout exceeded');
  }

  // 일기 저장
  static async create(diary: DiaryEntry): Promise<DiaryEntry> {
    try {
      return await this.retryOnBusy(() => {
        // 암호화: content, moodTag, aiComment
        const encrypted = encryptFields(diary);

        const stmt = db.prepare(`
          INSERT INTO diaries (_id, userId, date, content, weather, mood, moodTag, aiComment, stampType, model, importanceScore, createdAt, updatedAt, syncedWithServer, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          encrypted._id,
          encrypted.userId || 'unknown',
          encrypted.date,
          encrypted.content,
          encrypted.weather || null,
          encrypted.mood || null,
          encrypted.moodTag || null,
          encrypted.aiComment || null,
          encrypted.stampType || null,
          encrypted.model || null,
          encrypted.importanceScore || null,
          encrypted.createdAt,
          encrypted.updatedAt,
          encrypted.syncedWithServer ? 1 : 0,
          encrypted.version || 1 // 초기 버전은 1
        );

        return diary; // 원본 반환 (평문)
      });
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  // 일기 업데이트
  static async update(id: string, updates: Partial<DiaryEntry>): Promise<void> {
    try {
      await this.retryOnBusy(() => {
        // 암호화: content, moodTag, aiComment
        const encrypted = encryptFields(updates);

        const fields: string[] = [];
        const values: any[] = [];

        if (encrypted.content !== undefined) {
          fields.push('content = ?');
          values.push(encrypted.content);
        }
        if (encrypted.weather !== undefined) {
          fields.push('weather = ?');
          values.push(encrypted.weather);
        }
        if (encrypted.mood !== undefined) {
          fields.push('mood = ?');
          values.push(encrypted.mood);
        }
        if (encrypted.moodTag !== undefined) {
          fields.push('moodTag = ?');
          values.push(encrypted.moodTag);
        }
        if (encrypted.aiComment !== undefined) {
          fields.push('aiComment = ?');
          values.push(encrypted.aiComment);
        }
        if (encrypted.stampType !== undefined) {
          fields.push('stampType = ?');
          values.push(encrypted.stampType);
        }
        if (encrypted.model !== undefined) {
          fields.push('model = ?');
          values.push(encrypted.model);
        }
        if (encrypted.importanceScore !== undefined) {
          fields.push('importanceScore = ?');
          values.push(encrypted.importanceScore);
        }
        if (encrypted.syncedWithServer !== undefined) {
          fields.push('syncedWithServer = ?');
          values.push(encrypted.syncedWithServer ? 1 : 0);
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
      });
    } catch (error) {
      this.handleDatabaseError(error, 'update');
    }
  }

  // 일기 조회 (ID)
  static getById(id: string): DiaryEntry | null {
    try {
      const stmt = db.prepare('SELECT * FROM diaries WHERE _id = ? AND deletedAt IS NULL');
      const row = stmt.get(id) as any;

      if (!row) return null;

      const entry = {
        ...row,
        syncedWithServer: row.syncedWithServer === 1,
      };

      // 복호화: content, moodTag, aiComment
      return decryptFields(entry);
    } catch (error) {
      this.handleDatabaseError(error, 'getById');
    }
  }

  // 특정 사용자의 모든 일기 조회
  static getAllByUserId(userId: string): DiaryEntry[] {
    const stmt = db.prepare('SELECT * FROM diaries WHERE userId = ? AND deletedAt IS NULL ORDER BY date DESC');
    const rows = stmt.all(userId) as any[];

    return rows.map(row => {
      const entry = {
        ...row,
        syncedWithServer: row.syncedWithServer === 1,
      };
      // 복호화: content, moodTag, aiComment
      return decryptFields(entry);
    });
  }

  // 모든 일기 조회 (관리용)
  static getAll(): DiaryEntry[] {
    const stmt = db.prepare('SELECT * FROM diaries WHERE deletedAt IS NULL ORDER BY date DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => {
      const entry = {
        ...row,
        syncedWithServer: row.syncedWithServer === 1,
      };
      // 복호화: content, moodTag, aiComment
      return decryptFields(entry);
    });
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

    return rows.map(row => {
      const entry = {
        ...row,
        syncedWithServer: row.syncedWithServer === 1,
      };
      // 복호화: content, moodTag (AI 분석용)
      return decryptFields(entry);
    });
  }

  // 일기 삭제 (소프트 삭제)
  static async delete(id: string): Promise<void> {
    try {
      await this.retryOnBusy(() => {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
          UPDATE diaries
          SET deletedAt = ?, updatedAt = ?, version = version + 1
          WHERE _id = ? AND deletedAt IS NULL
        `);
        stmt.run(now, now, id);
      });
    } catch (error) {
      this.handleDatabaseError(error, 'delete');
    }
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

  // 최근 AI 코멘트 조회 (관리자용)
  static getRecentAIComments(limit: number = 10): any[] {
    console.log(`📋 [DiaryDatabase] 최근 AI 코멘트 ${limit}개 조회`);

    // AI 코멘트가 있는 최근 일기 조회 (updatedAt 기준 정렬)
    const stmt = db.prepare(`
      SELECT
        _id,
        userId,
        date,
        content,
        moodTag,
        aiComment,
        stampType,
        createdAt,
        updatedAt
      FROM diaries
      WHERE aiComment IS NOT NULL
        AND deletedAt IS NULL
      ORDER BY updatedAt DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];

    console.log(`✅ [DiaryDatabase] ${rows.length}개의 AI 코멘트 조회 완료`);

    return rows.map(row => {
      const entry = {
        ...row,
        syncedWithServer: row.syncedWithServer === 1,
      };
      // 복호화: content, moodTag, aiComment
      return decryptFields(entry);
    });
  }

  // DB 통계 조회 (관리자용)
  static getStats(): any {
    console.log(`📊 [DiaryDatabase] DB 통계 조회`);

    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM diaries WHERE deletedAt IS NULL');
    const total = (totalStmt.get() as any).count;

    const withCommentStmt = db.prepare('SELECT COUNT(*) as count FROM diaries WHERE aiComment IS NOT NULL AND deletedAt IS NULL');
    const withComment = (withCommentStmt.get() as any).count;

    const withoutCommentStmt = db.prepare('SELECT COUNT(*) as count FROM diaries WHERE aiComment IS NULL AND deletedAt IS NULL');
    const withoutComment = (withoutCommentStmt.get() as any).count;

    const deletedStmt = db.prepare('SELECT COUNT(*) as count FROM diaries WHERE deletedAt IS NOT NULL');
    const deleted = (deletedStmt.get() as any).count;

    const usersStmt = db.prepare('SELECT COUNT(DISTINCT userId) as count FROM diaries WHERE deletedAt IS NULL');
    const uniqueUsers = (usersStmt.get() as any).count;

    const stats = {
      totalDiaries: total,
      diariesWithAIComment: withComment,
      diariesWithoutAIComment: withoutComment,
      deletedDiaries: deleted,
      uniqueUsers: uniqueUsers,
    };

    console.log(`✅ [DiaryDatabase] 통계:`, stats);

    return stats;
  }

  // 모델 사용 통계 조회 (관리자용)
  static getModelStats(): any {
    console.log(`📊 [DiaryDatabase] 모델 사용 통계 조회`);

    // 전체 AI 코멘트 수
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM diaries WHERE aiComment IS NOT NULL AND deletedAt IS NULL');
    const total = (totalStmt.get() as any).count;

    // Sonnet 사용 횟수
    const sonnetStmt = db.prepare('SELECT COUNT(*) as count FROM diaries WHERE model = ? AND deletedAt IS NULL');
    const sonnetCount = (sonnetStmt.get('sonnet') as any).count;

    // Haiku 사용 횟수
    const haikuCount = (sonnetStmt.get('haiku') as any).count;

    // 모델 정보 없는 코멘트 (마이그레이션 전 데이터)
    const unknownStmt = db.prepare('SELECT COUNT(*) as count FROM diaries WHERE aiComment IS NOT NULL AND model IS NULL AND deletedAt IS NULL');
    const unknownCount = (unknownStmt.get() as any).count;

    // 평균 중요도 점수
    const avgScoreStmt = db.prepare('SELECT AVG(importanceScore) as avg FROM diaries WHERE importanceScore IS NOT NULL AND deletedAt IS NULL');
    const avgScore = (avgScoreStmt.get() as any).avg;

    // Sonnet 평균 중요도
    const sonnetAvgStmt = db.prepare('SELECT AVG(importanceScore) as avg FROM diaries WHERE model = ? AND deletedAt IS NULL');
    const sonnetAvgScore = (sonnetAvgStmt.get('sonnet') as any).avg;

    // Haiku 평균 중요도
    const haikuAvgScore = (sonnetAvgStmt.get('haiku') as any).avg;

    const stats = {
      totalComments: total,
      sonnetCount: sonnetCount,
      haikuCount: haikuCount,
      unknownCount: unknownCount,
      sonnetPercentage: total > 0 ? Math.round((sonnetCount / total) * 100) : 0,
      haikuPercentage: total > 0 ? Math.round((haikuCount / total) * 100) : 0,
      averageImportanceScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
      sonnetAverageScore: sonnetAvgScore ? Math.round(sonnetAvgScore * 10) / 10 : null,
      haikuAverageScore: haikuAvgScore ? Math.round(haikuAvgScore * 10) / 10 : null,
    };

    console.log(`✅ [DiaryDatabase] 모델 통계:`, stats);

    return stats;
  }

  // 어제 일기의 AI 코멘트 초기화 (관리자용 - 재생성용)
  static resetYesterdayComments(): number {
    // 어제 날짜 계산
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${year}-${month}-${day}`;

    console.log(`🔄 [DiaryDatabase] ${yesterdayStr} 날짜 일기의 AI 코멘트 초기화`);

    // 어제 날짜 일기의 aiComment와 stampType을 NULL로 설정
    const stmt = db.prepare(`
      UPDATE diaries
      SET aiComment = NULL, stampType = NULL, syncedWithServer = 0
      WHERE date LIKE ? AND deletedAt IS NULL
    `);
    const result = stmt.run(`${yesterdayStr}%`);

    console.log(`✅ [DiaryDatabase] ${result.changes}개 일기의 AI 코멘트 초기화 완료`);

    return result.changes;
  }
}

export class PushTokenDatabase {
  /**
   * SQLite 에러 처리 (DiaryDatabase와 동일)
   */
  private static handleDatabaseError(error: any, operation: string): never {
    return DiaryDatabase['handleDatabaseError'](error, `PushToken.${operation}`);
  }

  /**
   * SQLITE_BUSY 재시도 로직
   */
  private static async retryOnBusy<T>(
    fn: () => T,
    maxRetries: number = 3
  ): Promise<T> {
    return DiaryDatabase['retryOnBusy'](fn, maxRetries);
  }

  // Push Token 저장/업데이트
  static async upsert(userId: string, token: string): Promise<void> {
    try {
      await this.retryOnBusy(() => {
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
      });
    } catch (error) {
      this.handleDatabaseError(error, 'upsert');
    }
  }

  // Push Token 조회
  static get(userId: string): string | null {
    try {
      const stmt = db.prepare('SELECT token FROM push_tokens WHERE userId = ? AND deletedAt IS NULL');
      const row = stmt.get(userId) as any;
      return row ? row.token : null;
    } catch (error) {
      this.handleDatabaseError(error, 'get');
    }
  }

  // 모든 Push Token 조회
  static getAll(): Array<{ userId: string; token: string }> {
    try {
      const stmt = db.prepare('SELECT userId, token FROM push_tokens WHERE deletedAt IS NULL');
      return stmt.all() as Array<{ userId: string; token: string }>;
    } catch (error) {
      this.handleDatabaseError(error, 'getAll');
    }
  }

  // Push Token 삭제 (소프트 삭제)
  static async delete(userId: string): Promise<void> {
    try {
      await this.retryOnBusy(() => {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
          UPDATE push_tokens
          SET deletedAt = ?, updatedAt = ?, version = version + 1
          WHERE userId = ? AND deletedAt IS NULL
        `);
        stmt.run(now, now, userId);
      });
    } catch (error) {
      this.handleDatabaseError(error, 'delete');
    }
  }
}

export default db;
