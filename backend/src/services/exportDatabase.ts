import { Pool } from 'pg';
import { ExportJob, ExportStatus, ExportFormat } from '../types/export';
import { v4 as uuidv4 } from 'uuid';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Export Job Database Service
 */
export class ExportJobDatabase {
  /**
   * Create a new export job
   */
  static async create(userId: string, format: ExportFormat, email?: string): Promise<ExportJob> {
    const now = new Date().toISOString();
    const job: ExportJob = {
      id: uuidv4(),
      userId,
      status: 'pending',
      format,
      email,
      createdAt: now,
      updatedAt: now,
    };

    await pool.query(`
      INSERT INTO export_jobs (id, "userId", status, format, email, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [job.id, job.userId, job.status, job.format, job.email || null, job.createdAt, job.updatedAt]);

    console.log(`📝 [ExportDB] Created export job ${job.id} for user ${userId} (format: ${format})`);
    return job;
  }

  /**
   * Get export job by ID
   */
  static async get(id: string): Promise<ExportJob | null> {
    const result = await pool.query(`
      SELECT * FROM export_jobs WHERE id = $1
    `, [id]);

    return result.rows.length > 0 ? this.mapRowToJob(result.rows[0]) : null;
  }

  /**
   * Get all export jobs for a user
   */
  static async getAllForUser(userId: string): Promise<ExportJob[]> {
    const result = await pool.query(`
      SELECT * FROM export_jobs
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
    `, [userId]);

    return result.rows.map(row => this.mapRowToJob(row));
  }

  /**
   * Get pending export jobs
   */
  static async getPending(): Promise<ExportJob[]> {
    const result = await pool.query(`
      SELECT * FROM export_jobs
      WHERE status = 'pending'
      ORDER BY "createdAt" ASC
    `);

    return result.rows.map(row => this.mapRowToJob(row));
  }

  /**
   * Update export job status
   */
  static async updateStatus(
    id: string,
    status: ExportStatus,
    updates?: {
      s3Url?: string;
      expiresAt?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    const now = new Date().toISOString();

    if (updates) {
      await pool.query(`
        UPDATE export_jobs
        SET status = $1, "s3Url" = $2, "expiresAt" = $3, "errorMessage" = $4, "updatedAt" = $5
        WHERE id = $6
      `, [
        status,
        updates.s3Url || null,
        updates.expiresAt || null,
        updates.errorMessage || null,
        now,
        id
      ]);
    } else {
      await pool.query(`
        UPDATE export_jobs
        SET status = $1, "updatedAt" = $2
        WHERE id = $3
      `, [status, now, id]);
    }

    console.log(`✅ [ExportDB] Updated job ${id} status to ${status}`);
  }

  /**
   * Delete expired export jobs
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();

    const result = await pool.query(`
      DELETE FROM export_jobs
      WHERE "expiresAt" IS NOT NULL AND "expiresAt" < $1
    `, [now]);

    const deletedCount = result.rowCount || 0;

    if (deletedCount > 0) {
      console.log(`🗑️  [ExportDB] Deleted ${deletedCount} expired export job(s)`);
    }

    return deletedCount;
  }

  /**
   * Delete all export jobs for a user
   */
  static async deleteAllForUser(userId: string): Promise<number> {
    const result = await pool.query(`
      DELETE FROM export_jobs WHERE "userId" = $1
    `, [userId]);

    const deletedCount = result.rowCount || 0;

    console.log(`🗑️  [ExportDB] Deleted ${deletedCount} export job(s) for user ${userId}`);
    return deletedCount;
  }

  /**
   * Map database row to ExportJob
   */
  private static mapRowToJob(row: any): ExportJob {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status as ExportStatus,
      format: row.format as ExportFormat,
      email: row.email,
      s3Url: row.s3Url || undefined,
      expiresAt: row.expiresAt || undefined,
      errorMessage: row.errorMessage || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
