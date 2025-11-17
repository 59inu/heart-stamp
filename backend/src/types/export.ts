/**
 * Export job status
 */
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Export format
 */
export type ExportFormat = 'txt' | 'pdf';

/**
 * Export job entry
 */
export interface ExportJob {
  id: string;
  userId: string;
  status: ExportStatus;
  format: ExportFormat;
  email: string;
  s3Url?: string;
  expiresAt?: string; // ISO string
  errorMessage?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Export request from client
 */
export interface ExportRequest {
  format: ExportFormat;
  email: string;
}

/**
 * Export job response
 */
export interface ExportJobResponse {
  id: string;
  status: ExportStatus;
  format: ExportFormat;
  s3Url?: string;
  expiresAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
