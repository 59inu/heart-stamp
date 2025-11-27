import { Pool, PoolClient } from 'pg';
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

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  client_encoding: 'UTF8', // 이모지 및 다국어 지원
});

// Pool error handling
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// 테이블 생성 및 초기화
async function initializeDatabase() {
  try {
    // diaries 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS diaries (
        _id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        date TEXT NOT NULL,
        content TEXT NOT NULL,
        weather TEXT,
        mood TEXT,
        "moodTag" TEXT,
        "imageUri" TEXT,
        "imageGenerationStatus" TEXT,
        "aiComment" TEXT,
        "stampType" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        "syncedWithServer" BOOLEAN DEFAULT FALSE,
        "deletedAt" TEXT,
        version INTEGER DEFAULT 1,
        model TEXT,
        "importanceScore" INTEGER
      )
    `);

    // 인덱스 생성
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_userId ON diaries("userId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deletedAt ON diaries("deletedAt")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_date ON diaries(date)`);

    // 마이그레이션: imageUri, imageGenerationStatus 컬럼 추가 (이미 존재하면 무시)
    try {
      await pool.query(`ALTER TABLE diaries ADD COLUMN IF NOT EXISTS "imageUri" TEXT`);
      await pool.query(`ALTER TABLE diaries ADD COLUMN IF NOT EXISTS "imageGenerationStatus" TEXT`);
      console.log('✅ Migration: imageUri and imageGenerationStatus columns added');
    } catch (error) {
      console.log('ℹ️  Migration: columns already exist or migration not needed');
    }

    // push_tokens 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        "userId" TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        "deletedAt" TEXT,
        version INTEGER DEFAULT 1
      )
    `);

    // export_jobs 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS export_jobs (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        status TEXT NOT NULL,
        format TEXT NOT NULL,
        email TEXT NOT NULL,
        "s3Url" TEXT,
        "expiresAt" TEXT,
        "errorMessage" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_export_userId ON export_jobs("userId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_export_status ON export_jobs(status)`);

    // letters 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS letters (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        "isRead" BOOLEAN DEFAULT FALSE,
        "createdAt" TEXT NOT NULL,
        "readAt" TEXT
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_letters_userId ON letters("userId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_letters_isRead ON letters("isRead")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_letters_year_month ON letters(year, month)`);

    // notification_preferences 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        "userId" TEXT PRIMARY KEY,
        "teacherCommentEnabled" BOOLEAN NOT NULL DEFAULT true,
        "dailyReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
        "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 기존 토큰이 있는 유저는 자동으로 활성화로 설정 (마이그레이션)
    await pool.query(`
      INSERT INTO notification_preferences ("userId", "teacherCommentEnabled", "dailyReminderEnabled")
      SELECT "userId", true, true
      FROM push_tokens
      WHERE "deletedAt" IS NULL
      ON CONFLICT ("userId") DO NOTHING
    `);

    // prompts 테이블 생성 (AI 프롬프트 관리용)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        variables TEXT,
        version INTEGER DEFAULT 1,
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "updatedBy" TEXT
      )
    `);

    // prompt_history 테이블 생성 (프롬프트 버전 히스토리)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prompt_history (
        id SERIAL PRIMARY KEY,
        "promptId" TEXT NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        variables TEXT,
        version INTEGER NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "createdBy" TEXT
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prompt_history_promptId ON prompt_history("promptId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prompt_history_version ON prompt_history("promptId", version)`);

    console.log('✅ PostgreSQL database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL database:', error);
    throw error;
  }
}

// 초기화 실행
initializeDatabase()
  .then(async () => {
    // 기본 프롬프트 초기화
    await PromptDatabase.initializeDefaultPrompts();
    console.log('✅ Default prompts initialized');
  })
  .catch(console.error);

export class DiaryDatabase {
  /**
   * PostgreSQL 에러 처리
   */
  private static handleDatabaseError(error: any, operation: string): never {
    const err = error as any;

    // PostgreSQL 에러 코드별 처리
    if (err.code === '23505') { // unique_violation
      throw new DuplicateKeyError(
        `Duplicate entry in ${operation}`,
        { originalError: err.message }
      );
    }

    if (err.code === '53100' || err.code === '53200' || err.code === '53300') { // disk_full
      throw new DiskFullError(
        'Database disk is full',
        { originalError: err.message }
      );
    }

    if (err.code === '55P03' || err.code === '40P01') { // lock_not_available or deadlock_detected
      throw new DatabaseLockError(
        'Database is locked or deadlocked',
        { originalError: err.message }
      );
    }

    if (err.code === '08000' || err.code === '08003' || err.code === '08006') { // connection errors
      throw new DatabaseCorruptError(
        'Database connection error',
        { originalError: err.message }
      );
    }

    // 기타 PostgreSQL 에러
    throw new DatabaseError(
      `Database error in ${operation}: ${err.message}`,
      err.code,
      { originalError: err.message }
    );
  }

  /**
   * 재시도 로직 (deadlock 등)
   */
  private static async retryOnError<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        if (
          (error.code === '40P01' || error.code === '55P03') && // deadlock or lock timeout
          attempt < maxRetries
        ) {
          const delay = 100 * (attempt + 1); // 100ms, 200ms, 300ms
          console.warn(`⚠️  Database error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw new DatabaseLockError('Database retry timeout exceeded');
  }

  // 일기 저장
  static async create(diary: DiaryEntry): Promise<DiaryEntry> {
    try {
      return await this.retryOnError(async () => {
        // 암호화: content, moodTag, aiComment
        const encrypted = encryptFields(diary);

        console.log('🔍 [DB Create] diary.imageGenerationStatus:', diary.imageGenerationStatus);
        console.log('🔍 [DB Create] encrypted.imageGenerationStatus:', encrypted.imageGenerationStatus);

        await pool.query(
          `INSERT INTO diaries (_id, "userId", date, content, weather, mood, "moodTag", "imageUri", "imageGenerationStatus", "aiComment", "stampType", model, "importanceScore", "createdAt", "updatedAt", "syncedWithServer", version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            encrypted._id,
            encrypted.userId || 'unknown',
            encrypted.date,
            encrypted.content,
            encrypted.weather || null,
            encrypted.mood || null,
            encrypted.moodTag || null,
            encrypted.imageUri || null,
            encrypted.imageGenerationStatus || null,
            encrypted.aiComment || null,
            encrypted.stampType || null,
            encrypted.model || null,
            encrypted.importanceScore || null,
            encrypted.createdAt,
            encrypted.updatedAt,
            encrypted.syncedWithServer || false,
            encrypted.version || 1,
          ]
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
      await this.retryOnError(async () => {
        // 암호화: content, moodTag, aiComment
        const encrypted = encryptFields(updates);

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        // updates 객체의 키를 확인
        if ('userId' in updates) {
          fields.push(`"userId" = $${paramIndex++}`);
          values.push(encrypted.userId ?? null);
        }
        if ('content' in updates) {
          fields.push(`content = $${paramIndex++}`);
          values.push(encrypted.content ?? null);
        }
        if ('weather' in updates) {
          fields.push(`weather = $${paramIndex++}`);
          values.push(encrypted.weather ?? null);
        }
        if ('mood' in updates) {
          fields.push(`mood = $${paramIndex++}`);
          values.push(encrypted.mood ?? null);
        }
        if ('moodTag' in updates) {
          fields.push(`"moodTag" = $${paramIndex++}`);
          values.push(encrypted.moodTag ?? null);
        }
        if ('imageUri' in updates) {
          fields.push(`"imageUri" = $${paramIndex++}`);
          values.push(encrypted.imageUri ?? null);
        }
        if ('imageGenerationStatus' in updates) {
          console.log('🔍 [DB Update] updates.imageGenerationStatus:', updates.imageGenerationStatus);
          console.log('🔍 [DB Update] encrypted.imageGenerationStatus:', encrypted.imageGenerationStatus);
          fields.push(`"imageGenerationStatus" = $${paramIndex++}`);
          values.push(encrypted.imageGenerationStatus ?? null);
        }
        if ('aiComment' in updates) {
          fields.push(`"aiComment" = $${paramIndex++}`);
          values.push(encrypted.aiComment ?? null);
        }
        if ('stampType' in updates) {
          fields.push(`"stampType" = $${paramIndex++}`);
          values.push(encrypted.stampType ?? null);
        }
        if ('model' in updates) {
          fields.push(`model = $${paramIndex++}`);
          values.push(encrypted.model ?? null);
        }
        if ('importanceScore' in updates) {
          fields.push(`"importanceScore" = $${paramIndex++}`);
          values.push(encrypted.importanceScore ?? null);
        }
        if ('syncedWithServer' in updates) {
          fields.push(`"syncedWithServer" = $${paramIndex++}`);
          values.push(encrypted.syncedWithServer || false);
        }

        fields.push(`"updatedAt" = $${paramIndex++}`);
        values.push(new Date().toISOString());

        // 버전 증가
        fields.push(`version = version + 1`);

        values.push(id);

        await pool.query(
          `UPDATE diaries
           SET ${fields.join(', ')}
           WHERE _id = $${paramIndex} AND "deletedAt" IS NULL`,
          values
        );
      });
    } catch (error) {
      this.handleDatabaseError(error, 'update');
    }
  }

  // 일기 조회 (ID)
  static async getById(id: string): Promise<DiaryEntry | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM diaries WHERE _id = $1 AND "deletedAt" IS NULL',
        [id]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const entry = {
        ...row,
        syncedWithServer: row.syncedWithServer === true,
      };

      // 복호화: content, moodTag, aiComment
      return decryptFields(entry);
    } catch (error) {
      this.handleDatabaseError(error, 'getById');
    }
  }

  // 특정 사용자의 모든 일기 조회
  static async getAllByUserId(userId: string): Promise<DiaryEntry[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM diaries WHERE "userId" = $1 AND "deletedAt" IS NULL ORDER BY date DESC',
        [userId]
      );

      return result.rows.map(row => {
        const entry = {
          ...row,
          syncedWithServer: row.syncedWithServer === true,
        };
        return decryptFields(entry);
      });
    } catch (error) {
      this.handleDatabaseError(error, 'getAllByUserId');
    }
  }

  // 모든 일기 조회 (관리용)
  static async getAll(): Promise<DiaryEntry[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM diaries WHERE "deletedAt" IS NULL ORDER BY date DESC'
      );

      return result.rows.map(row => {
        const entry = {
          ...row,
          syncedWithServer: row.syncedWithServer === true,
        };
        return decryptFields(entry);
      });
    } catch (error) {
      this.handleDatabaseError(error, 'getAll');
    }
  }

  // AI 코멘트 없는 일기 조회 (전날 작성된 일기만)
  static async getPending(): Promise<DiaryEntry[]> {
    try {
      // 어제 날짜 계산
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${year}-${month}-${day}`;

      console.log(`📅 [DiaryDatabase] 배치 작업 대상 날짜: ${yesterdayStr}`);

      const result = await pool.query(
        'SELECT * FROM diaries WHERE "aiComment" IS NULL AND date LIKE $1 AND "deletedAt" IS NULL ORDER BY date DESC',
        [`${yesterdayStr}%`]
      );

      console.log(`📋 [DiaryDatabase] ${yesterdayStr} 날짜 일기 중 AI 코멘트 대기: ${result.rows.length}개`);

      return result.rows.map(row => {
        const entry = {
          ...row,
          syncedWithServer: row.syncedWithServer === true,
        };
        return decryptFields(entry);
      });
    } catch (error) {
      this.handleDatabaseError(error, 'getPending');
    }
  }

  // 일기 삭제 (소프트 삭제)
  static async delete(id: string): Promise<void> {
    try {
      await this.retryOnError(async () => {
        const now = new Date().toISOString();
        await pool.query(
          `UPDATE diaries
           SET "deletedAt" = $1, "updatedAt" = $2, version = version + 1
           WHERE _id = $3 AND "deletedAt" IS NULL`,
          [now, now, id]
        );
      });
    } catch (error) {
      this.handleDatabaseError(error, 'delete');
    }
  }

  // 어제 날짜 일기 중 AI 코멘트가 있는 사용자 목록 조회
  static async getUsersWithAICommentYesterday(): Promise<string[]> {
    try {
      // 어제 날짜 계산 (TZ 환경변수 영향받음)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${year}-${month}-${day}`;

      console.log(`📅 [DiaryDatabase] 알림 대상자 조회: ${yesterdayStr} 날짜 일기 (TZ=${process.env.TZ || 'UTC'})`);

      const result = await pool.query(
        'SELECT DISTINCT "userId" FROM diaries WHERE date LIKE $1 AND "aiComment" IS NOT NULL AND "deletedAt" IS NULL',
        [`${yesterdayStr}%`]
      );

      const userIds = result.rows.map(row => row.userId);
      console.log(`👥 [DiaryDatabase] ${yesterdayStr} 일기 AI 코멘트 받은 사용자: ${userIds.length}명`);

      return userIds;
    } catch (error) {
      this.handleDatabaseError(error, 'getUsersWithAICommentYesterday');
    }
  }

  // 어제 날짜 일기 중 AI 코멘트가 있는 사용자별 일기 ID 조회
  static async getUserDiaryMapYesterday(): Promise<Map<string, string>> {
    try {
      // 어제 날짜 계산 (TZ 환경변수 영향받음)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${year}-${month}-${day}`;

      console.log(`📅 [DiaryDatabase] 사용자별 일기 ID 조회: ${yesterdayStr} 날짜 (TZ=${process.env.TZ || 'UTC'})`);

      const result = await pool.query(
        'SELECT "userId", _id FROM diaries WHERE date LIKE $1 AND "aiComment" IS NOT NULL AND "deletedAt" IS NULL',
        [`${yesterdayStr}%`]
      );

      const userDiaryMap = new Map<string, string>();
      for (const row of result.rows) {
        userDiaryMap.set(row.userId, row._id);
      }

      console.log(`👥 [DiaryDatabase] ${yesterdayStr} 일기 사용자-ID 매핑: ${userDiaryMap.size}개`);

      return userDiaryMap;
    } catch (error) {
      this.handleDatabaseError(error, 'getUserDiaryMapYesterday');
      return new Map();
    }
  }

  // 특정 사용자가 오늘 일기를 작성했는지 확인
  static async hasUserWrittenToday(userId: string): Promise<boolean> {
    try {
      // 오늘 날짜 계산 (TZ 환경변수 영향받음)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const result = await pool.query(
        'SELECT COUNT(*) as count FROM diaries WHERE "userId" = $1 AND date LIKE $2 AND "deletedAt" IS NULL',
        [userId, `${todayStr}%`]
      );

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      this.handleDatabaseError(error, 'hasUserWrittenToday');
      return false; // 에러 시 false 반환 (안전하게)
    }
  }

  // 최근 AI 코멘트 조회 (관리자용)
  static async getRecentAIComments(limit: number = 10): Promise<any[]> {
    try {
      console.log(`📋 [DiaryDatabase] 최근 AI 코멘트 ${limit}개 조회`);

      const result = await pool.query(
        `SELECT
          _id,
          "userId",
          date,
          content,
          "moodTag",
          "aiComment",
          model,
          "importanceScore",
          "stampType",
          "createdAt",
          "updatedAt"
        FROM diaries
        WHERE "aiComment" IS NOT NULL
          AND "deletedAt" IS NULL
        ORDER BY "updatedAt" DESC
        LIMIT $1`,
        [limit]
      );

      console.log(`✅ [DiaryDatabase] ${result.rows.length}개의 AI 코멘트 조회 완료`);

      return result.rows.map(row => {
        const entry = {
          ...row,
          syncedWithServer: row.syncedWithServer === true,
        };
        return decryptFields(entry);
      });
    } catch (error) {
      this.handleDatabaseError(error, 'getRecentAIComments');
    }
  }

  // 최근 폴백 코멘트 조회 (관리자용)
  static async getFallbackComments(limit: number = 10): Promise<any[]> {
    try {
      console.log(`📋 [DiaryDatabase] 최근 폴백 코멘트 ${limit}개 조회`);

      const result = await pool.query(
        `SELECT
          _id,
          "userId",
          date,
          content,
          "moodTag",
          "aiComment",
          model,
          "importanceScore",
          "stampType",
          "createdAt",
          "updatedAt"
        FROM diaries
        WHERE "aiComment" IS NOT NULL
          AND model IS NULL
          AND "deletedAt" IS NULL
        ORDER BY "updatedAt" DESC
        LIMIT $1`,
        [limit]
      );

      console.log(`✅ [DiaryDatabase] ${result.rows.length}개의 폴백 코멘트 조회 완료`);

      return result.rows.map(row => {
        const entry = {
          ...row,
          syncedWithServer: row.syncedWithServer === true,
        };
        return decryptFields(entry);
      });
    } catch (error) {
      this.handleDatabaseError(error, 'getFallbackComments');
    }
  }

  // DB 통계 조회 (관리자용)
  static async getStats(): Promise<any> {
    try {
      console.log(`📊 [DiaryDatabase] DB 통계 조회`);

      const totalResult = await pool.query('SELECT COUNT(*) as count FROM diaries WHERE "deletedAt" IS NULL');
      const total = parseInt(totalResult.rows[0].count);

      const withCommentResult = await pool.query('SELECT COUNT(*) as count FROM diaries WHERE "aiComment" IS NOT NULL AND "deletedAt" IS NULL');
      const withComment = parseInt(withCommentResult.rows[0].count);

      const withoutCommentResult = await pool.query('SELECT COUNT(*) as count FROM diaries WHERE "aiComment" IS NULL AND "deletedAt" IS NULL');
      const withoutComment = parseInt(withoutCommentResult.rows[0].count);

      const deletedResult = await pool.query('SELECT COUNT(*) as count FROM diaries WHERE "deletedAt" IS NOT NULL');
      const deleted = parseInt(deletedResult.rows[0].count);

      const usersResult = await pool.query('SELECT COUNT(DISTINCT "userId") as count FROM diaries WHERE "deletedAt" IS NULL');
      const uniqueUsers = parseInt(usersResult.rows[0].count);

      const stats = {
        totalDiaries: total,
        diariesWithAIComment: withComment,
        diariesWithoutAIComment: withoutComment,
        deletedDiaries: deleted,
        uniqueUsers: uniqueUsers,
      };

      console.log(`✅ [DiaryDatabase] 통계:`, stats);

      return stats;
    } catch (error) {
      this.handleDatabaseError(error, 'getStats');
    }
  }

  // 모델 사용 통계 조회 (관리자용)
  static async getModelStats(): Promise<any> {
    try {
      console.log(`📊 [DiaryDatabase] 모델 사용 통계 조회`);

      const totalResult = await pool.query('SELECT COUNT(*) as count FROM diaries WHERE "aiComment" IS NOT NULL AND "deletedAt" IS NULL');
      const total = parseInt(totalResult.rows[0].count);

      const sonnetResult = await pool.query('SELECT COUNT(*) as count FROM diaries WHERE model = $1 AND "deletedAt" IS NULL', ['sonnet']);
      const sonnetCount = parseInt(sonnetResult.rows[0].count);

      const haikuResult = await pool.query('SELECT COUNT(*) as count FROM diaries WHERE model = $1 AND "deletedAt" IS NULL', ['haiku']);
      const haikuCount = parseInt(haikuResult.rows[0].count);

      const unknownResult = await pool.query('SELECT COUNT(*) as count FROM diaries WHERE "aiComment" IS NOT NULL AND model IS NULL AND "deletedAt" IS NULL');
      const unknownCount = parseInt(unknownResult.rows[0].count);

      const avgScoreResult = await pool.query('SELECT AVG("importanceScore") as avg FROM diaries WHERE "importanceScore" IS NOT NULL AND "deletedAt" IS NULL');
      const avgScore = avgScoreResult.rows[0].avg ? parseFloat(avgScoreResult.rows[0].avg) : null;

      const sonnetAvgResult = await pool.query('SELECT AVG("importanceScore") as avg FROM diaries WHERE model = $1 AND "deletedAt" IS NULL', ['sonnet']);
      const sonnetAvgScore = sonnetAvgResult.rows[0].avg ? parseFloat(sonnetAvgResult.rows[0].avg) : null;

      const haikuAvgResult = await pool.query('SELECT AVG("importanceScore") as avg FROM diaries WHERE model = $1 AND "deletedAt" IS NULL', ['haiku']);
      const haikuAvgScore = haikuAvgResult.rows[0].avg ? parseFloat(haikuAvgResult.rows[0].avg) : null;

      const totalWithModel = sonnetCount + haikuCount;

      const stats = {
        totalComments: total,
        sonnetCount: sonnetCount,
        haikuCount: haikuCount,
        unknownCount: unknownCount,
        sonnetPercentage: totalWithModel > 0 ? Math.round((sonnetCount / totalWithModel) * 100) : 0,
        haikuPercentage: totalWithModel > 0 ? Math.round((haikuCount / totalWithModel) * 100) : 0,
        averageImportanceScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
        sonnetAverageScore: sonnetAvgScore ? Math.round(sonnetAvgScore * 10) / 10 : null,
        haikuAverageScore: haikuAvgScore ? Math.round(haikuAvgScore * 10) / 10 : null,
      };

      console.log(`✅ [DiaryDatabase] 모델 통계:`, stats);

      return stats;
    } catch (error) {
      this.handleDatabaseError(error, 'getModelStats');
    }
  }

  // 어제 일기의 AI 코멘트 초기화 (관리자용)
  static async resetYesterdayComments(): Promise<number> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${year}-${month}-${day}`;

      console.log(`🔄 [DiaryDatabase] ${yesterdayStr} 날짜 일기의 AI 코멘트 초기화`);

      const result = await pool.query(
        `UPDATE diaries
         SET "aiComment" = NULL, "stampType" = NULL, "syncedWithServer" = FALSE
         WHERE date LIKE $1 AND "deletedAt" IS NULL`,
        [`${yesterdayStr}%`]
      );

      console.log(`✅ [DiaryDatabase] ${result.rowCount}개 일기의 AI 코멘트 초기화 완료`);

      return result.rowCount || 0;
    } catch (error) {
      this.handleDatabaseError(error, 'resetYesterdayComments');
    }
  }

  // [Admin] 통계 조회
  // 비용 추정 단가 (USD per comment)
  private static readonly COST_PER_SONNET = 0.01;
  private static readonly COST_PER_HAIKU = 0.001;

  static async getAdminStats(): Promise<{
    activeUserCount: number;
    validUserCount: number;
    modelStats: {
      total: number;
      sonnet: { count: number; percentage: number };
      haiku: { count: number; percentage: number };
      fallback: { count: number; percentage: number };
    };
    costEstimate: {
      total: number;
      sonnet: number;
      haiku: number;
      currency: string;
    };
    dailyTrend: Array<{
      date: string;
      sonnet: number;
      haiku: number;
      fallback: number;
    }>;
    weeklyTrend: Array<{
      week: string;
      sonnet: number;
      haiku: number;
      fallback: number;
    }>;
  }> {
    try {
      // 활성 사용자: 일기 작성 이력 있음 (삭제 포함)
      const activeResult = await pool.query(
        'SELECT COUNT(DISTINCT "userId") as count FROM diaries'
      );

      // 유효 사용자: 삭제 안 한 일기 있음
      const validResult = await pool.query(
        'SELECT COUNT(DISTINCT "userId") as count FROM diaries WHERE "deletedAt" IS NULL'
      );

      // 모델별 통계
      const modelResult = await pool.query(`
        SELECT
          model,
          COUNT(*) as count
        FROM diaries
        WHERE "aiComment" IS NOT NULL AND "deletedAt" IS NULL
        GROUP BY model
      `);

      let sonnetCount = 0;
      let haikuCount = 0;
      let fallbackCount = 0;

      for (const row of modelResult.rows) {
        if (row.model === 'sonnet') {
          sonnetCount = parseInt(row.count, 10);
        } else if (row.model === 'haiku') {
          haikuCount = parseInt(row.count, 10);
        } else {
          fallbackCount = parseInt(row.count, 10);
        }
      }

      const totalComments = sonnetCount + haikuCount + fallbackCount;

      // 일별 추이 (최근 14일)
      const dailyResult = await pool.query(`
        SELECT
          LEFT("createdAt", 10) as date,
          model,
          COUNT(*) as count
        FROM diaries
        WHERE "aiComment" IS NOT NULL
          AND "deletedAt" IS NULL
          AND "createdAt" >= (CURRENT_DATE - INTERVAL '14 days')::text
        GROUP BY LEFT("createdAt", 10), model
        ORDER BY date DESC
      `);

      // 일별 데이터 정리
      const dailyMap = new Map<string, { sonnet: number; haiku: number; fallback: number }>();
      for (const row of dailyResult.rows) {
        const date = row.date;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { sonnet: 0, haiku: 0, fallback: 0 });
        }
        const entry = dailyMap.get(date)!;
        const count = parseInt(row.count, 10);
        if (row.model === 'sonnet') {
          entry.sonnet = count;
        } else if (row.model === 'haiku') {
          entry.haiku = count;
        } else {
          entry.fallback = count;
        }
      }

      const dailyTrend = Array.from(dailyMap.entries())
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => b.date.localeCompare(a.date));

      // 주별 추이 (최근 12주)
      const weeklyResult = await pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('week', "createdAt"::timestamp), 'YYYY-MM-DD') as week,
          model,
          COUNT(*) as count
        FROM diaries
        WHERE "aiComment" IS NOT NULL
          AND "deletedAt" IS NULL
          AND "createdAt" >= (CURRENT_DATE - INTERVAL '12 weeks')::text
        GROUP BY DATE_TRUNC('week', "createdAt"::timestamp), model
        ORDER BY week DESC
      `);

      // 주별 데이터 정리
      const weeklyMap = new Map<string, { sonnet: number; haiku: number; fallback: number }>();
      for (const row of weeklyResult.rows) {
        const week = row.week;
        if (!weeklyMap.has(week)) {
          weeklyMap.set(week, { sonnet: 0, haiku: 0, fallback: 0 });
        }
        const entry = weeklyMap.get(week)!;
        const count = parseInt(row.count, 10);
        if (row.model === 'sonnet') {
          entry.sonnet = count;
        } else if (row.model === 'haiku') {
          entry.haiku = count;
        } else {
          entry.fallback = count;
        }
      }

      const weeklyTrend = Array.from(weeklyMap.entries())
        .map(([week, counts]) => ({ week, ...counts }))
        .sort((a, b) => b.week.localeCompare(a.week));

      // 비용 추정
      const sonnetCost = sonnetCount * this.COST_PER_SONNET;
      const haikuCost = haikuCount * this.COST_PER_HAIKU;
      const totalCost = sonnetCost + haikuCost;

      return {
        activeUserCount: parseInt(activeResult.rows[0].count, 10),
        validUserCount: parseInt(validResult.rows[0].count, 10),
        modelStats: {
          total: totalComments,
          sonnet: {
            count: sonnetCount,
            percentage: totalComments > 0 ? Math.round((sonnetCount / totalComments) * 100) : 0,
          },
          haiku: {
            count: haikuCount,
            percentage: totalComments > 0 ? Math.round((haikuCount / totalComments) * 100) : 0,
          },
          fallback: {
            count: fallbackCount,
            percentage: totalComments > 0 ? Math.round((fallbackCount / totalComments) * 100) : 0,
          },
        },
        costEstimate: {
          total: Math.round(totalCost * 1000) / 1000,
          sonnet: Math.round(sonnetCost * 1000) / 1000,
          haiku: Math.round(haikuCost * 1000) / 1000,
          currency: 'USD',
        },
        dailyTrend,
        weeklyTrend,
      };
    } catch (error) {
      this.handleDatabaseError(error, 'getAdminStats');
      return {
        activeUserCount: 0,
        validUserCount: 0,
        modelStats: {
          total: 0,
          sonnet: { count: 0, percentage: 0 },
          haiku: { count: 0, percentage: 0 },
          fallback: { count: 0, percentage: 0 },
        },
        costEstimate: {
          total: 0,
          sonnet: 0,
          haiku: 0,
          currency: 'USD',
        },
        dailyTrend: [],
        weeklyTrend: [],
      };
    }
  }

  // [Admin] 코멘트 조회 (검색 조건 적용)
  static async getCommentsForAdmin(options: {
    startDate?: string;
    endDate?: string;
    status?: 'normal' | 'fallback' | 'all';
    decrypt?: boolean;
  }): Promise<any[]> {
    try {
      const { startDate, endDate, status = 'all', decrypt = false } = options;

      let query = `
        SELECT
          _id,
          "userId",
          date,
          model,
          "aiComment",
          "createdAt"
        FROM diaries
        WHERE "aiComment" IS NOT NULL
          AND "deletedAt" IS NULL
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // 날짜 필터
      if (startDate) {
        query += ` AND date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        query += ` AND date <= $${paramIndex}`;
        params.push(endDate + 'T23:59:59');
        paramIndex++;
      }

      // 상태 필터
      if (status === 'normal') {
        query += ` AND model IS NOT NULL`;
      } else if (status === 'fallback') {
        query += ` AND model IS NULL`;
      }

      query += ` ORDER BY date DESC`;

      const result = await pool.query(query, params);

      return result.rows.map(row => {
        const isFallback = row.model === null;
        const entry = {
          diaryId: row._id,
          userId: row.userId,
          model: row.model,
          createdAt: row.createdAt,
          isFallback,
          aiComment: decrypt ? decryptFields({ aiComment: row.aiComment }).aiComment : '[암호화됨]',
        };
        return entry;
      });
    } catch (error) {
      this.handleDatabaseError(error, 'getCommentsForAdmin');
      return [];
    }
  }

  // [Admin] 일기 조회 (검색 조건 적용)
  static async getDiariesForAdmin(options: {
    startDate?: string;
    endDate?: string;
    hasComment?: boolean;
    userId?: string;
    decrypt?: boolean;
  }): Promise<any[]> {
    try {
      const { startDate, endDate, hasComment, userId, decrypt = false } = options;

      let query = `
        SELECT
          _id,
          "userId",
          date,
          content,
          "moodTag",
          "aiComment",
          "imageGenerationStatus",
          "imageUri",
          "createdAt"
        FROM diaries
        WHERE "deletedAt" IS NULL
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // 날짜 필터 (일기 날짜 기준)
      if (startDate) {
        query += ` AND date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        query += ` AND date <= $${paramIndex}`;
        params.push(endDate + 'T23:59:59');
        paramIndex++;
      }

      // 코멘트 유무 필터
      if (hasComment === true) {
        query += ` AND "aiComment" IS NOT NULL`;
      } else if (hasComment === false) {
        query += ` AND "aiComment" IS NULL`;
      }

      // 유저 필터
      if (userId) {
        query += ` AND "userId" = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      query += ` ORDER BY "createdAt" DESC`;

      const result = await pool.query(query, params);

      return result.rows.map(row => {
        // moodTag는 항상 복호화 (감정 태그는 민감 정보가 아님)
        const decryptedMoodTag = row.moodTag ? decryptFields({ moodTag: row.moodTag }).moodTag : null;
        const decryptedContent = decrypt ? decryptFields({ content: row.content }).content : '[암호화됨]';

        return {
          diaryId: row._id,
          userId: row.userId,
          date: row.date,
          content: decryptedContent,
          hasComment: row.aiComment !== null,
          hasGeneratedImage: row.imageGenerationStatus === 'completed',
          imageUri: row.imageUri || null,
          moodTag: decryptedMoodTag,
          createdAt: row.createdAt,
        };
      });
    } catch (error) {
      this.handleDatabaseError(error, 'getDiariesForAdmin');
      return [];
    }
  }

  // [Admin] 일기 통계 조회
  static async getDiaryStats(): Promise<{
    // 기본 현황
    totalDiaries: number;
    withComment: number;
    withoutComment: number;
    withGeneratedImage: number;
    // 사용자 활동
    avgDiariesPerUser: number;
    writersThisWeek: number;
    writersLastWeek: number;
    // 감정 분포
    moodDistribution: {
      red: number;
      yellow: number;
      green: number;
      none: number;
    };
    // 일별 추이 (최근 14일)
    dailyTrend: Array<{
      date: string;
      count: number;
    }>;
  }> {
    try {
      // 기본 현황
      const totalResult = await pool.query(
        'SELECT COUNT(*) as count FROM diaries WHERE "deletedAt" IS NULL'
      );
      const totalDiaries = parseInt(totalResult.rows[0].count, 10);

      const withCommentResult = await pool.query(
        'SELECT COUNT(*) as count FROM diaries WHERE "aiComment" IS NOT NULL AND "deletedAt" IS NULL'
      );
      const withComment = parseInt(withCommentResult.rows[0].count, 10);

      const withImageResult = await pool.query(
        `SELECT COUNT(*) as count FROM diaries WHERE "imageGenerationStatus" = 'completed' AND "deletedAt" IS NULL`
      );
      const withGeneratedImage = parseInt(withImageResult.rows[0].count, 10);

      // 사용자 활동
      const userCountResult = await pool.query(
        'SELECT COUNT(DISTINCT "userId") as count FROM diaries WHERE "deletedAt" IS NULL'
      );
      const userCount = parseInt(userCountResult.rows[0].count, 10);
      const avgDiariesPerUser = userCount > 0 ? Math.round((totalDiaries / userCount) * 10) / 10 : 0;

      // 이번 주 작성자 (월요일 기준)
      const thisWeekResult = await pool.query(`
        SELECT COUNT(DISTINCT "userId") as count FROM diaries
        WHERE date >= DATE_TRUNC('week', CURRENT_DATE)::text
          AND "deletedAt" IS NULL
      `);
      const writersThisWeek = parseInt(thisWeekResult.rows[0].count, 10);

      // 지난 주 작성자
      const lastWeekResult = await pool.query(`
        SELECT COUNT(DISTINCT "userId") as count FROM diaries
        WHERE date >= (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days')::text
          AND date < DATE_TRUNC('week', CURRENT_DATE)::text
          AND "deletedAt" IS NULL
      `);
      const writersLastWeek = parseInt(lastWeekResult.rows[0].count, 10);

      // 감정 분포
      const moodResult = await pool.query(`
        SELECT mood, COUNT(*) as count
        FROM diaries
        WHERE "deletedAt" IS NULL
        GROUP BY mood
      `);
      const moodDistribution = { red: 0, yellow: 0, green: 0, none: 0 };
      for (const row of moodResult.rows) {
        if (row.mood === 'red') moodDistribution.red = parseInt(row.count, 10);
        else if (row.mood === 'yellow') moodDistribution.yellow = parseInt(row.count, 10);
        else if (row.mood === 'green') moodDistribution.green = parseInt(row.count, 10);
        else moodDistribution.none = parseInt(row.count, 10);
      }

      // 일별 추이 (최근 14일)
      const dailyResult = await pool.query(`
        SELECT LEFT(date, 10) as date, COUNT(*) as count
        FROM diaries
        WHERE "deletedAt" IS NULL
          AND date >= (CURRENT_DATE - INTERVAL '14 days')::text
        GROUP BY LEFT(date, 10)
        ORDER BY date DESC
      `);
      const dailyTrend = dailyResult.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count, 10),
      }));

      return {
        totalDiaries,
        withComment,
        withoutComment: totalDiaries - withComment,
        withGeneratedImage,
        avgDiariesPerUser,
        writersThisWeek,
        writersLastWeek,
        moodDistribution,
        dailyTrend,
      };
    } catch (error) {
      this.handleDatabaseError(error, 'getDiaryStats');
      return {
        totalDiaries: 0,
        withComment: 0,
        withoutComment: 0,
        withGeneratedImage: 0,
        avgDiariesPerUser: 0,
        writersThisWeek: 0,
        writersLastWeek: 0,
        moodDistribution: { red: 0, yellow: 0, green: 0, none: 0 },
        dailyTrend: [],
      };
    }
  }

  // 사용자의 모든 일기 삭제 (하드 삭제)
  static async deleteAllForUser(userId: string): Promise<number> {
    try {
      return await this.retryOnError(async () => {
        const result = await pool.query('DELETE FROM diaries WHERE "userId" = $1', [userId]);
        console.log(`🗑️  [DiaryDatabase] Deleted ${result.rowCount} diaries for user ${userId}`);
        return result.rowCount || 0;
      });
    } catch (error) {
      this.handleDatabaseError(error, 'deleteAllForUser');
    }
  }
}

export class PushTokenDatabase {
  /**
   * PostgreSQL 에러 처리
   */
  private static handleDatabaseError(error: any, operation: string): never {
    return DiaryDatabase['handleDatabaseError'](error, `PushToken.${operation}`);
  }

  /**
   * 재시도 로직
   */
  private static async retryOnError<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    return DiaryDatabase['retryOnError'](fn, maxRetries);
  }

  // Push Token 저장/업데이트
  static async upsert(userId: string, token: string): Promise<void> {
    try {
      await this.retryOnError(async () => {
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO push_tokens ("userId", token, "createdAt", "updatedAt", version)
           VALUES ($1, $2, $3, $4, 1)
           ON CONFLICT ("userId") DO UPDATE SET
             token = EXCLUDED.token,
             "updatedAt" = EXCLUDED."updatedAt",
             version = push_tokens.version + 1,
             "deletedAt" = NULL`,
          [userId, token, now, now]
        );
      });
    } catch (error) {
      this.handleDatabaseError(error, 'upsert');
    }
  }

  // Push Token 조회
  static async get(userId: string): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT token FROM push_tokens WHERE "userId" = $1 AND "deletedAt" IS NULL',
        [userId]
      );
      return result.rows.length > 0 ? result.rows[0].token : null;
    } catch (error) {
      this.handleDatabaseError(error, 'get');
    }
  }

  // 모든 Push Token 조회
  static async getAll(): Promise<Array<{ userId: string; token: string }>> {
    try {
      const result = await pool.query(
        'SELECT "userId", token FROM push_tokens WHERE "deletedAt" IS NULL'
      );
      return result.rows.map(row => ({ userId: row.userId, token: row.token }));
    } catch (error) {
      this.handleDatabaseError(error, 'getAll');
    }
  }

  // Push Token 삭제 (소프트 삭제)
  static async delete(userId: string): Promise<void> {
    try {
      await this.retryOnError(async () => {
        const now = new Date().toISOString();
        await pool.query(
          `UPDATE push_tokens
           SET "deletedAt" = $1, "updatedAt" = $2, version = version + 1
           WHERE "userId" = $3 AND "deletedAt" IS NULL`,
          [now, now, userId]
        );
      });
    } catch (error) {
      this.handleDatabaseError(error, 'delete');
    }
  }
}

export class NotificationPreferencesDatabase {
  /**
   * PostgreSQL 에러 처리
   */
  private static handleDatabaseError(error: any, operation: string): never {
    return DiaryDatabase['handleDatabaseError'](error, `NotificationPreferences.${operation}`);
  }

  /**
   * 재시도 로직
   */
  private static async retryOnError<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    return DiaryDatabase['retryOnError'](fn, maxRetries);
  }

  /**
   * 알림 설정 저장/업데이트
   */
  static async upsert(
    userId: string,
    preferences: {
      teacherCommentEnabled?: boolean;
      dailyReminderEnabled?: boolean;
      marketingEnabled?: boolean;
    }
  ): Promise<void> {
    try {
      await this.retryOnError(async () => {
        const {
          teacherCommentEnabled,
          dailyReminderEnabled,
          marketingEnabled = false  // 기본값 false
        } = preferences;

        await pool.query(
          `INSERT INTO notification_preferences
           ("userId", "teacherCommentEnabled", "dailyReminderEnabled", "marketingEnabled", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT ("userId") DO UPDATE SET
             "teacherCommentEnabled" = COALESCE($2, notification_preferences."teacherCommentEnabled"),
             "dailyReminderEnabled" = COALESCE($3, notification_preferences."dailyReminderEnabled"),
             "marketingEnabled" = COALESCE($4, notification_preferences."marketingEnabled"),
             "updatedAt" = NOW()`,
          [userId, teacherCommentEnabled, dailyReminderEnabled, marketingEnabled]
        );
      });
    } catch (error) {
      this.handleDatabaseError(error, 'upsert');
    }
  }

  /**
   * 알림 설정 조회
   */
  static async get(userId: string): Promise<{
    userId: string;
    teacherCommentEnabled: boolean;
    dailyReminderEnabled: boolean;
    marketingEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  } | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM notification_preferences WHERE "userId" = $1',
        [userId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      this.handleDatabaseError(error, 'get');
    }
  }

  /**
   * 알림 설정이 활성화된 사용자만 필터링
   */
  static async filterEnabled(
    userIds: string[],
    type: 'teacher_comment' | 'daily_reminder'
  ): Promise<string[]> {
    try {
      if (userIds.length === 0) {
        return [];
      }

      const column = type === 'teacher_comment'
        ? '"teacherCommentEnabled"'
        : '"dailyReminderEnabled"';

      const result = await pool.query(
        `SELECT "userId" FROM notification_preferences
         WHERE "userId" = ANY($1) AND ${column} = true`,
        [userIds]
      );

      const enabledUserIds = result.rows.map(row => row.userId);

      // preference가 없는 유저 찾기 (하위 호환성)
      const usersWithPreference = new Set(enabledUserIds);
      const usersWithoutPreference = userIds.filter(id => !usersWithPreference.has(id));

      if (usersWithoutPreference.length > 0) {
        console.log(`⚠️  [NotificationPreferences] ${usersWithoutPreference.length} users have no preference, creating with default (enabled)`);

        // preference 자동 생성 (기본값: 활성화)
        for (const userId of usersWithoutPreference) {
          await this.upsert(userId, {
            teacherCommentEnabled: true,
            dailyReminderEnabled: true
          });
        }

        // 모두 활성화로 간주
        return [...enabledUserIds, ...usersWithoutPreference];
      }

      return enabledUserIds;
    } catch (error) {
      this.handleDatabaseError(error, 'filterEnabled');
    }
  }
}

export class PromptDatabase {
  // 프롬프트 캐시 (메모리)
  private static cache: Map<string, { content: string; variables: string[] }> = new Map();

  /**
   * 프롬프트 조회 (캐시 우선)
   */
  static async get(id: string): Promise<string | null> {
    // 캐시에 있으면 캐시에서 반환
    if (this.cache.has(id)) {
      return this.cache.get(id)!.content;
    }

    try {
      const result = await pool.query(
        'SELECT content, variables FROM prompts WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) return null;

      const { content, variables } = result.rows[0];
      this.cache.set(id, {
        content,
        variables: variables ? JSON.parse(variables) : [],
      });

      return content;
    } catch (error) {
      console.error(`❌ [PromptDatabase] Failed to get prompt ${id}:`, error);
      return null;
    }
  }

  /**
   * 모든 프롬프트 조회
   */
  static async getAll(): Promise<Array<{
    id: string;
    name: string;
    content: string;
    variables: string[];
    version: number;
    updatedAt: string;
    updatedBy: string | null;
  }>> {
    try {
      const result = await pool.query(
        'SELECT id, name, content, variables, version, "updatedAt", "updatedBy" FROM prompts ORDER BY id'
      );

      return result.rows.map(row => ({
        ...row,
        variables: row.variables ? JSON.parse(row.variables) : [],
      }));
    } catch (error) {
      console.error('❌ [PromptDatabase] Failed to get all prompts:', error);
      return [];
    }
  }

  /**
   * 프롬프트 저장/업데이트 (기존 버전은 히스토리에 저장)
   */
  static async upsert(
    id: string,
    name: string,
    content: string,
    variables: string[],
    updatedBy?: string
  ): Promise<boolean> {
    try {
      // 기존 프롬프트 조회 (히스토리 저장용)
      const existing = await pool.query(
        'SELECT name, content, variables, version, "updatedBy" FROM prompts WHERE id = $1',
        [id]
      );

      // 기존 버전이 있으면 히스토리에 저장
      if (existing.rows.length > 0) {
        const old = existing.rows[0];
        await pool.query(
          `INSERT INTO prompt_history ("promptId", name, content, variables, version, "createdAt", "createdBy")
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [id, old.name, old.content, old.variables, old.version, old.updatedBy]
        );
        console.log(`📜 [PromptDatabase] Saved version ${old.version} of '${id}' to history`);
      }

      // 새 버전 저장
      await pool.query(
        `INSERT INTO prompts (id, name, content, variables, version, "updatedAt", "updatedBy")
         VALUES ($1, $2, $3, $4, 1, NOW(), $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           content = EXCLUDED.content,
           variables = EXCLUDED.variables,
           version = prompts.version + 1,
           "updatedAt" = NOW(),
           "updatedBy" = EXCLUDED."updatedBy"`,
        [id, name, content, JSON.stringify(variables), updatedBy || null]
      );

      // 캐시 갱신
      this.cache.set(id, { content, variables });

      console.log(`✅ [PromptDatabase] Prompt '${id}' saved (by ${updatedBy || 'system'})`);
      return true;
    } catch (error) {
      console.error(`❌ [PromptDatabase] Failed to upsert prompt ${id}:`, error);
      return false;
    }
  }

  /**
   * 프롬프트 버전 히스토리 조회
   */
  static async getHistory(promptId: string): Promise<Array<{
    id: number;
    promptId: string;
    name: string;
    content: string;
    variables: string[];
    version: number;
    createdAt: string;
    createdBy: string | null;
  }>> {
    try {
      const result = await pool.query(
        `SELECT id, "promptId", name, content, variables, version, "createdAt", "createdBy"
         FROM prompt_history
         WHERE "promptId" = $1
         ORDER BY version DESC`,
        [promptId]
      );

      return result.rows.map(row => ({
        ...row,
        variables: row.variables ? JSON.parse(row.variables) : [],
      }));
    } catch (error) {
      console.error(`❌ [PromptDatabase] Failed to get history for ${promptId}:`, error);
      return [];
    }
  }

  /**
   * 특정 버전의 프롬프트 조회 (히스토리에서)
   */
  static async getVersion(promptId: string, version: number): Promise<{
    name: string;
    content: string;
    variables: string[];
    version: number;
    createdAt: string;
    createdBy: string | null;
  } | null> {
    try {
      const result = await pool.query(
        `SELECT name, content, variables, version, "createdAt", "createdBy"
         FROM prompt_history
         WHERE "promptId" = $1 AND version = $2`,
        [promptId, version]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        variables: row.variables ? JSON.parse(row.variables) : [],
      };
    } catch (error) {
      console.error(`❌ [PromptDatabase] Failed to get version ${version} of ${promptId}:`, error);
      return null;
    }
  }

  /**
   * 특정 버전으로 복원 (새 버전으로 저장)
   */
  static async restoreVersion(promptId: string, version: number, restoredBy?: string): Promise<boolean> {
    try {
      const oldVersion = await this.getVersion(promptId, version);
      if (!oldVersion) {
        console.error(`❌ [PromptDatabase] Version ${version} of ${promptId} not found`);
        return false;
      }

      // 복원 시 upsert 호출 (현재 버전을 히스토리에 저장 후 복원)
      const success = await this.upsert(
        promptId,
        oldVersion.name,
        oldVersion.content,
        oldVersion.variables,
        restoredBy || 'system'
      );

      if (success) {
        console.log(`🔄 [PromptDatabase] Restored '${promptId}' to version ${version}`);
      }

      return success;
    } catch (error) {
      console.error(`❌ [PromptDatabase] Failed to restore ${promptId} to version ${version}:`, error);
      return false;
    }
  }

  /**
   * 캐시 초기화 (서버 시작 시 호출)
   */
  static async loadCache(): Promise<void> {
    try {
      const prompts = await this.getAll();
      for (const prompt of prompts) {
        this.cache.set(prompt.id, {
          content: prompt.content,
          variables: prompt.variables,
        });
      }
      console.log(`✅ [PromptDatabase] Loaded ${prompts.length} prompts into cache`);
    } catch (error) {
      console.error('❌ [PromptDatabase] Failed to load cache:', error);
    }
  }

  /**
   * 캐시 클리어
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [PromptDatabase] Cache cleared');
  }

  /**
   * 초기 프롬프트 데이터 삽입 (없는 경우에만)
   */
  static async initializeDefaultPrompts(): Promise<void> {
    const defaultPrompts = [
      {
        id: 'comment',
        name: '코멘트 생성',
        variables: ['responseLength', 'emotionTag', 'diaryContent'],
        content: `당신은 따뜻한 초등학교 담임 선생님입니다.
학생의 일기를 읽고 {{responseLength}}로 구체적이고 깊이 있게 반응해주세요.
학생이 선택한 감정: "{{emotionTag}}"

규칙:
- "그렇구나", "그러게", "응", "맞아", "그렇지" 등으로 시작해 학생의 말을 먼저 수용하되 늘 새로운 표현으로 시작하도록 노력
- 톤: 연상 느낌의 반말로 친근하게 (~겠네, ~구나, ~지, ~겠다)
- 비속어: 순화 (예: "개빡쳤다" → "짜증 났겠다")
- 일기 속 구체적 사건 2개 이상 언급하되, ""로 직접 인용하지 말고 자연스럽게 언급
- 학생의 감정을 자연스럽게 표현 ("힘들었겠다", "속상했지", "짜증 났겠다")
- 자연스러운 일임을 확인 ("당연해", "다들 그래")
- 조언보다는 학생의 생각이나 행동을 긍정적으로 관찰하고 칭찬 ("멋진 생각이야", "잘했어", "대단한데?")
- 청유형은 가끔만, 주로 관찰과 지지로
- 판단하지 말고 학생이 겪은 일 존중하며 지지
- 학생의 나이를 알 수 없습니다. 성인일 수도 있으므로 연령을 전제로 한 표현을 사용하지 마세요
- 이모지는 사용하지 마세요
- **중요: 반드시 완전한 문장으로 끝내세요. 문장 중간에서 끊기지 않도록 주의하세요. 마지막 문장은 마침표(.), 물음표(?), 느낌표(!)로 끝나야 합니다.**


일기:
{{diaryContent}}`,
      },
      {
        id: 'importance',
        name: '중요도 분석',
        variables: ['diaryContent'],
        content: `당신은 일기 분석 전문가입니다.
아래 일기를 읽고, AI 코멘트 생성 시 더 뛰어난 모델(Sonnet)이 필요한지 판단해주세요.

다음 4가지 기준으로 각각 0-10점을 매겨주세요:

1. **감정적 강도** (0-10점)
   - 감정 변화의 폭과 깊이
   - 복잡한 감정이나 양가감정의 존재
   - 감정 표현의 생생함

2. **의미있는 사건** (0-10점)
   - 관계적 전환점이나 중요한 상호작용
   - 개인적 성취나 도전
   - 건강/치료 관련 진전

3. **성찰의 깊이** (0-10점)
   - 자기 자신에 대한 새로운 발견
   - 삶의 패턴이나 의미에 대한 통찰
   - 미래에 대한 구체적 계획이나 결심

4. **변화의 신호** (0-10점)
   - 새로운 시도나 첫 경험
   - 증상, 상태, 습관의 변화
   - 관점이나 태도의 전환

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
{
  "emotional_intensity": 5,
  "significant_event": 3,
  "depth_of_reflection": 2,
  "change_signal": 4,
  "total": 14,
  "reason": "일상적인 하루에 대한 담담한 기록. 특별한 감정 변화나 의미있는 사건 없음."
}

일기:
{{diaryContent}}`,
      },
      {
        id: 'scene',
        name: '장면 추출',
        variables: ['diaryContent'],
        content: `당신은 일기를 읽고 그림일기로 표현할 핵심 장면을 추출하는 전문가입니다.

아래 일기를 읽고, 가장 중요하고 그림으로 표현하기 좋은 한 장면을 선택해 단순하게 설명해주세요.

규칙:
- 구체적인 장면 하나만 선택 (예: "친구와 카페에서 이야기하는 모습", "공원에서 산책하는 모습")
- 어린이 그림일기 스타일로 표현 가능하도록 단순화
- 불필요한 세부사항 제거
- 1-2문장으로 간결하게
- 표현해야하는 감정이나 분위기 형용
- **사람 이름을 절대 표기하지 마세요** (예: "지연이" → "friend", "엄마" → "family member")
- **성별을 모호하게 표현하세요** (예: "a person", "someone", "a friend" 등 성별 중립적 표현 사용)
- 영어로 응답하세요 (이미지 생성 API용)

일기:
{{diaryContent}}`,
      },
    ];

    for (const prompt of defaultPrompts) {
      // 이미 존재하는지 확인
      const existing = await this.get(prompt.id);
      if (!existing) {
        await this.upsert(prompt.id, prompt.name, prompt.content, prompt.variables, 'system');
        console.log(`✅ [PromptDatabase] Default prompt '${prompt.id}' initialized`);
      }
    }
  }
}

export { pool };
export default pool;
