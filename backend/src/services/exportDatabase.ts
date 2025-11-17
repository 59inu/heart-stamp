import Database from 'better-sqlite3';
import path from 'path';
import { ExportJob, ExportStatus, ExportFormat } from '../types/export';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(__dirname, '../../diary.db');
const db = new Database(dbPath);

/**
 * Export Job Database Service
 */
export class ExportJobDatabase {
  /**
   * Create a new export job
   */
  static create(userId: string, format: ExportFormat, email: string): ExportJob {
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

    const stmt = db.prepare(`
      INSERT INTO export_jobs (id, userId, status, format, email, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(job.id, job.userId, job.status, job.format, job.email, job.createdAt, job.updatedAt);

    console.log(`📝 [ExportDB] Created export job ${job.id} for user ${userId} (format: ${format}, email: ${email})`);
    return job;
  }

  /**
   * Get export job by ID
   */
  static get(id: string): ExportJob | null {
    const stmt = db.prepare(`
      SELECT * FROM export_jobs WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    return row ? this.mapRowToJob(row) : null;
  }

  /**
   * Get all export jobs for a user
   */
  static getAllForUser(userId: string): ExportJob[] {
    const stmt = db.prepare(`
      SELECT * FROM export_jobs
      WHERE userId = ?
      ORDER BY createdAt DESC
    `);

    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.mapRowToJob(row));
  }

  /**
   * Get pending export jobs
   */
  static getPending(): ExportJob[] {
    const stmt = db.prepare(`
      SELECT * FROM export_jobs
      WHERE status = 'pending'
      ORDER BY createdAt ASC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToJob(row));
  }

  /**
   * Update export job status
   */
  static updateStatus(
    id: string,
    status: ExportStatus,
    updates?: {
      s3Url?: string;
      expiresAt?: string;
      errorMessage?: string;
    }
  ): void {
    const now = new Date().toISOString();

    if (updates) {
      const stmt = db.prepare(`
        UPDATE export_jobs
        SET status = ?, s3Url = ?, expiresAt = ?, errorMessage = ?, updatedAt = ?
        WHERE id = ?
      `);

      stmt.run(
        status,
        updates.s3Url || null,
        updates.expiresAt || null,
        updates.errorMessage || null,
        now,
        id
      );
    } else {
      const stmt = db.prepare(`
        UPDATE export_jobs
        SET status = ?, updatedAt = ?
        WHERE id = ?
      `);

      stmt.run(status, now, id);
    }

    console.log(`✅ [ExportDB] Updated job ${id} status to ${status}`);
  }

  /**
   * Delete expired export jobs
   */
  static deleteExpired(): number {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      DELETE FROM export_jobs
      WHERE expiresAt IS NOT NULL AND expiresAt < ?
    `);

    const result = stmt.run(now);
    const deletedCount = result.changes;

    if (deletedCount > 0) {
      console.log(`🗑️  [ExportDB] Deleted ${deletedCount} expired export job(s)`);
    }

    return deletedCount;
  }

  /**
   * Delete all export jobs for a user
   */
  static deleteAllForUser(userId: string): number {
    const stmt = db.prepare(`
      DELETE FROM export_jobs WHERE userId = ?
    `);

    const result = stmt.run(userId);
    const deletedCount = result.changes;

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
