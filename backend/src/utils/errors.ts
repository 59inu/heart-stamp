/**
 * 커스텀 에러 클래스들
 */

/**
 * 앱 에러 기본 클래스
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 데이터베이스 에러
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    public sqliteCode?: string,
    details?: any
  ) {
    super(message, 'DATABASE_ERROR', 500, true, details);
  }
}

/**
 * 중복 키 에러
 */
export class DuplicateKeyError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'SQLITE_CONSTRAINT', details);
    this.code = 'DUPLICATE_KEY';
    this.statusCode = 409; // Conflict
  }
}

/**
 * 디스크 공간 부족 에러
 */
export class DiskFullError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'SQLITE_FULL', details);
    this.code = 'DISK_FULL';
    this.statusCode = 507; // Insufficient Storage
  }
}

/**
 * 데이터베이스 잠금 타임아웃 에러
 */
export class DatabaseLockError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'SQLITE_BUSY', details);
    this.code = 'DATABASE_LOCKED';
    this.statusCode = 503; // Service Unavailable
  }
}

/**
 * 데이터베이스 손상 에러
 */
export class DatabaseCorruptError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'SQLITE_CORRUPT', details);
    this.code = 'DATABASE_CORRUPT';
    this.statusCode = 500;
    this.isOperational = false; // 복구 불가능
  }
}

/**
 * 리소스를 찾을 수 없음
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, true, details);
  }
}

/**
 * 입력 검증 에러
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, true, details);
  }
}

/**
 * 인증 에러
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, details);
  }
}

/**
 * 권한 에러
 */
export class AuthorizationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, details);
  }
}

/**
 * Rate Limit 에러
 */
export class RateLimitError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true, details);
  }
}
