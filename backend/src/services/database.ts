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

    console.log('✅ PostgreSQL database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL database:', error);
    throw error;
  }
}

// 초기화 실행
initializeDatabase().catch(console.error);

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
          content,
          "moodTag",
          "aiComment",
          "imageUri",
          "createdAt"
        FROM diaries
        WHERE "deletedAt" IS NULL
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // 날짜 필터
      if (startDate) {
        query += ` AND "createdAt" >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        query += ` AND "createdAt" <= $${paramIndex}`;
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
        const decrypted = decrypt ? decryptFields({ content: row.content, moodTag: row.moodTag }) : null;
        return {
          diaryId: row._id,
          userId: row.userId,
          content: decrypt ? decrypted?.content : '[암호화됨]',
          hasComment: row.aiComment !== null,
          hasImage: row.imageUri !== null && row.imageUri !== '',
          moodTag: decrypt ? decrypted?.moodTag : (row.moodTag ? '[암호화됨]' : null),
          createdAt: row.createdAt,
        };
      });
    } catch (error) {
      this.handleDatabaseError(error, 'getDiariesForAdmin');
      return [];
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

export { pool };
export default pool;
