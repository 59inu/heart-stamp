import crypto from 'crypto';

/**
 * 암호화 서비스
 * AES-256-GCM을 사용한 필드 단위 암호화
 * - content (일기 내용)
 * - moodTag (감정 태그)
 * - aiComment (AI 코멘트)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128비트
const AUTH_TAG_LENGTH = 16; // 128비트
const KEY_LENGTH = 32; // 256비트

/**
 * 환경 변수에서 마스터 키 가져오기
 * 없으면 에러 (프로덕션에서는 필수)
 */
function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'development-encryption-key';

  if (!process.env.ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    console.warn('⚠️ Using default encryption key in development mode');
  }

  // 항상 SHA-256 해시하여 정확히 32바이트 키 생성
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * 데이터 암호화
 * @param plaintext 평문
 * @returns 암호화된 데이터 (Base64: iv:authTag:encrypted)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return plaintext;
  }

  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // 포맷: iv:authTag:encrypted (모두 Base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 데이터 복호화
 * @param ciphertext 암호화된 데이터 (Base64: iv:authTag:encrypted)
 * @returns 평문
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    return ciphertext;
  }

  // 암호화되지 않은 평문인지 확인 (마이그레이션 지원)
  if (!ciphertext.includes(':')) {
    // 평문으로 간주
    console.warn('⚠️ Decrypting unencrypted data (migration mode)');
    return ciphertext;
  }

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, encrypted] = parts;

    const key = getMasterKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * 암호화가 필요한 필드 목록
 */
export const ENCRYPTED_FIELDS = ['content', 'moodTag', 'aiComment'] as const;

/**
 * 객체의 특정 필드들을 암호화
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: readonly string[] = ENCRYPTED_FIELDS
): T {
  const result: any = { ...obj };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field]);
    }
  }

  return result as T;
}

/**
 * 객체의 특정 필드들을 복호화
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: readonly string[] = ENCRYPTED_FIELDS
): T {
  const result: any = { ...obj };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field]);
      } catch (error) {
        console.error(`Failed to decrypt field '${field}':`, error);
        // 복호화 실패 시 원본 유지 (마이그레이션 지원)
        // 실제 프로덕션에서는 에러를 던질 수도 있음
      }
    }
  }

  return result as T;
}

/**
 * 암호화 키 생성 유틸리티
 * 새로운 32바이트 랜덤 키 생성
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * 암호화 서비스 초기화 (키 검증)
 */
export function initialize(): void {
  try {
    const key = getMasterKey();

    if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY must be set in production');
    }

    // 키 검증: 간단한 암호화/복호화 테스트
    const testData = 'encryption-test';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testData) {
      throw new Error('Encryption key validation failed');
    }

    console.log('✅ Encryption service initialized');

    if (!process.env.ENCRYPTION_KEY) {
      console.warn('⚠️ Using default encryption key (DEV MODE ONLY)');
    }
  } catch (error) {
    console.error('❌ Encryption service initialization failed:', error);
    throw error;
  }
}
