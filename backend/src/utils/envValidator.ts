/**
 * 환경 변수 검증 유틸리티
 * 서버 시작 시 필수 환경 변수 검증
 */

interface EnvValidationError {
  variable: string;
  message: string;
  severity: 'error' | 'warning';
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * 환경 변수 검증 및 시작 전 에러 체크
 */
export function validateEnvironment(): void {
  const errors: EnvValidationError[] = [];

  // 1. 프로덕션에서 필수 환경 변수
  if (IS_PRODUCTION) {
    // 암호화 키 (필수)
    if (!process.env.ENCRYPTION_KEY) {
      errors.push({
        variable: 'ENCRYPTION_KEY',
        message: 'Encryption key is required in production',
        severity: 'error',
      });
    }

    // Firebase 서비스 계정 (필수)
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      errors.push({
        variable: 'FIREBASE_SERVICE_ACCOUNT_PATH',
        message: 'Firebase service account path is required in production',
        severity: 'error',
      });
    }

    // Admin 시크릿 (필수)
    if (!process.env.ADMIN_SECRET) {
      errors.push({
        variable: 'ADMIN_SECRET',
        message: 'Admin secret is required in production',
        severity: 'error',
      });
    }

    // CORS 허용 오리진 (wildcard 금지)
    if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*') {
      errors.push({
        variable: 'ALLOWED_ORIGINS',
        message: 'ALLOWED_ORIGINS must be explicitly set in production (no wildcards)',
        severity: 'error',
      });
    }

    // Firebase Auth 활성화 (필수)
    if (process.env.USE_FIREBASE_AUTH !== 'true') {
      errors.push({
        variable: 'USE_FIREBASE_AUTH',
        message: 'Firebase authentication must be enabled in production',
        severity: 'error',
      });
    }
  }

  // 2. 모든 환경에서 권장되는 변수
  if (!process.env.CLAUDE_API_KEY) {
    errors.push({
      variable: 'CLAUDE_API_KEY',
      message: 'Claude API key is not set - AI features will not work',
      severity: 'warning',
    });
  }

  if (!process.env.PORT) {
    errors.push({
      variable: 'PORT',
      message: 'PORT not set - using default 3000',
      severity: 'warning',
    });
  }

  // 3. S3 설정 검증 (선택적)
  if (process.env.AWS_S3_BUCKET_NAME && !process.env.AWS_REGION) {
    errors.push({
      variable: 'AWS_REGION',
      message: 'AWS_REGION is required when AWS_S3_BUCKET_NAME is set',
      severity: 'warning',
    });
  }

  // 4. 결과 출력
  const criticalErrors = errors.filter(e => e.severity === 'error');
  const warnings = errors.filter(e => e.severity === 'warning');

  if (warnings.length > 0) {
    console.log('\n⚠️  Environment Variable Warnings:');
    warnings.forEach(err => {
      console.log(`   - ${err.variable}: ${err.message}`);
    });
  }

  if (criticalErrors.length > 0) {
    console.error('\n❌ Environment Variable Errors:');
    criticalErrors.forEach(err => {
      console.error(`   - ${err.variable}: ${err.message}`);
    });
    console.error('\n💥 Server cannot start with missing critical environment variables\n');
    throw new Error('Environment validation failed');
  }

  if (errors.length === 0) {
    console.log('✅ Environment variables validated');
  } else {
    console.log(`✅ Environment variables validated (${warnings.length} warnings)`);
  }
}

/**
 * 개발 모드 확인
 */
export function isDevelopment(): boolean {
  return IS_DEVELOPMENT || !IS_PRODUCTION;
}

/**
 * 프로덕션 모드 확인
 */
export function isProduction(): boolean {
  return IS_PRODUCTION;
}

/**
 * 환경 변수 안전하게 가져오기 (민감한 정보 로깅 방지)
 */
export function getEnvSafely(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * 환경 정보 출력 (디버깅용)
 */
export function printEnvironmentInfo(): void {
  console.log('\n📋 Environment Information:');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - Port: ${process.env.PORT || '3000'}`);
  console.log(`   - Firebase Auth: ${process.env.USE_FIREBASE_AUTH === 'true' ? 'Enabled' : 'Disabled (Dev Mode)'}`);
  console.log(`   - CORS Origins: ${process.env.ALLOWED_ORIGINS || '*'}`);
  console.log(`   - Claude API: ${process.env.CLAUDE_API_KEY ? 'Configured' : 'Not Set'}`);
  console.log(`   - Encryption: ${process.env.ENCRYPTION_KEY ? 'Custom Key' : 'Default Dev Key'}`);
  console.log(`   - S3 Storage: ${process.env.AWS_S3_BUCKET_NAME ? 'Enabled' : 'Local Storage'}\n`);
}
