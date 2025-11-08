# 보안 전략 (Security Strategy)

Heart Stamp Diary의 보안 설계 및 데이터 보호 전략을 설명합니다.

## 🔐 보안 계층 구조

```
┌─────────────────────────────────┐
│  Transport Layer (HTTPS/TLS)    │ ← 전송 암호화
├─────────────────────────────────┤
│  Application Layer              │
│  - Rate Limiting                │ ← DDoS 방어
│  - CORS                         │ ← 오리진 검증
│  - Authentication               │ ← 인증
├─────────────────────────────────┤
│  Data Layer                     │
│  - Field Encryption (AES-256)   │ ← 필드 암호화
│  - Soft Delete                  │ ← 데이터 복구
│  - Version Control              │ ← 충돌 해결
└─────────────────────────────────┘
```

## 🔒 데이터 암호화

### AES-256-GCM 암호화

**알고리즘**: AES-256-GCM (Galois/Counter Mode)
- **키 크기**: 256비트 (32바이트)
- **IV 크기**: 128비트 (16바이트, 매 암호화마다 랜덤 생성)
- **Auth Tag**: 128비트 (무결성 검증)

**암호화 대상 필드**:
- `content` (일기 내용)
- `moodTag` (감정 태그)
- `aiComment` (AI 코멘트)

### 암호화 플로우

```typescript
// 암호화
plaintext: "오늘은 정말 행복한 하루였어요!"
    ↓
1. 랜덤 IV 생성 (16바이트)
2. AES-256-GCM 암호화
3. Auth Tag 생성 (무결성 검증)
    ↓
ciphertext: "iv:authTag:encrypted"
Format: "Base64:Base64:Base64"

// 복호화
ciphertext: "iv:authTag:encrypted"
    ↓
1. IV, Auth Tag, 암호문 분리
2. Auth Tag 검증 (변조 여부 확인)
3. AES-256-GCM 복호화
    ↓
plaintext: "오늘은 정말 행복한 하루였어요!"
```

### 암호화 키 관리

**환경 변수 저장**:
```bash
# 32바이트 이상 랜덤 키 (Base64 인코딩)
ENCRYPTION_KEY=<랜덤 키>

# 키 생성 방법
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**키 검증 (서버 시작 시)**:
```typescript
// 간단한 암호화/복호화 테스트
const testData = 'encryption-test';
const encrypted = encrypt(testData);
const decrypted = decrypt(encrypted);

if (decrypted !== testData) {
  throw new Error('Encryption key validation failed');
}
```

**프로덕션 필수 사항**:
- ✅ 환경 변수에 커스텀 키 설정
- ❌ 기본 키 사용 금지
- ❌ 코드에 하드코딩 금지
- ❌ Git에 커밋 금지

### 마이그레이션 지원

```typescript
// 기존 평문 데이터 자동 처리
decrypt(ciphertext) {
  // 암호화되지 않은 데이터 (콜론 없음)
  if (!ciphertext.includes(':')) {
    console.warn('⚠️ Decrypting unencrypted data');
    return ciphertext; // 평문 그대로 반환
  }

  // 암호화된 데이터 복호화
  // ...
}
```

## 🚦 Rate Limiting (요청 제한)

### 일반 API 제한

```typescript
generalApiLimiter: {
  windowMs: 15 * 60 * 1000,  // 15분
  max: 100,                   // 최대 100개 요청
  message: 'Too many requests'
}
```

**제한 초과 시**:
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

### 관리자 API 제한

```typescript
adminLimiter: {
  windowMs: 15 * 60 * 1000,  // 15분
  max: 10,                    // 최대 10개 요청
  message: 'Too many admin requests'
}
```

**보호 대상 엔드포인트**:
- `POST /api/jobs/trigger-analysis`
- `POST /api/jobs/trigger-backup`
- `POST /api/push/test-*`

## 🌐 CORS (Cross-Origin Resource Sharing)

### 개발 환경

```typescript
ALLOWED_ORIGINS=*

// 모든 오리진 허용 (TestFlight 테스트용)
origin: (origin, callback) => {
  if (!IS_PRODUCTION) {
    return callback(null, true);
  }
}
```

### 프로덕션 환경

```typescript
ALLOWED_ORIGINS=https://app.heartstampdiary.com

// 화이트리스트 검증
origin: (origin, callback) => {
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  console.warn(`🚫 Blocked request from: ${origin}`);
  callback(new Error('Not allowed by CORS'));
}
```

**Wildcard 금지**:
```typescript
if (IS_PRODUCTION && allowedOrigins.includes('*')) {
  throw new Error('CORS wildcard (*) not allowed in production');
}
```

## 🛡️ SQL Injection 방어

### Prepared Statements 사용

```typescript
// ✅ 안전 (Prepared Statement)
const stmt = db.prepare('SELECT * FROM diaries WHERE _id = ?');
const row = stmt.get(id);

// ❌ 위험 (문자열 연결)
const query = `SELECT * FROM diaries WHERE _id = '${id}'`;
db.exec(query); // SQL Injection 취약
```

**모든 쿼리에 Prepared Statement 강제**:
- `db.prepare()` 사용
- 파라미터 바인딩 (`?` 플레이스홀더)
- 동적 쿼리 생성 금지

## 🔑 인증 토큰 보안

### Firebase ID 토큰 (프로덕션)

```typescript
// 토큰 검증
const idToken = req.headers.authorization.substring(7); // "Bearer " 제거
const decodedToken = await admin.auth().verifyIdToken(idToken);

// 만료된 토큰 자동 거부
if (decodedToken.exp < Date.now() / 1000) {
  throw new Error('Token expired');
}
```

### 관리자 시크릿 토큰

```typescript
// 환경 변수 저장
ADMIN_SECRET=<32바이트 이상 랜덤 문자열>

// 요청 헤더 검증
const adminToken = req.headers['x-admin-token'];
if (adminToken !== process.env.ADMIN_SECRET) {
  return res.status(403).json({ message: 'Invalid admin token' });
}
```

**생성 방법**:
```bash
# UUID v4 사용
node -e "console.log(require('crypto').randomUUID())"
# 예: "550e8400-e29b-41d4-a716-446655440000"
```

## 🗑️ 소프트 삭제 (Soft Delete)

### 개념

데이터를 물리적으로 삭제하지 않고 `deletedAt` 타임스탬프만 설정

**장점**:
- ✅ 실수로 삭제한 데이터 복구 가능
- ✅ 감사 로그 유지 (언제 삭제되었는지)
- ✅ GDPR 준수 (삭제 요청 처리 가능)

### 구현

```sql
-- 삭제 시
UPDATE diaries
SET deletedAt = '2025-11-08T12:34:56.789Z',
    updatedAt = '2025-11-08T12:34:56.789Z',
    version = version + 1
WHERE _id = '123-456-789';

-- 조회 시 (삭제된 데이터 제외)
SELECT * FROM diaries
WHERE userId = 'user123' AND deletedAt IS NULL;
```

### 완전 삭제 (Hard Delete)

```typescript
// 30일 후 완전 삭제 (배치 작업)
DELETE FROM diaries
WHERE deletedAt IS NOT NULL
  AND deletedAt < datetime('now', '-30 days');
```

## 🔄 동시성 제어 (Optimistic Locking)

### 버전 관리

```sql
-- 버전 컬럼 추가
ALTER TABLE diaries ADD COLUMN version INTEGER DEFAULT 1;

-- 업데이트 시 버전 증가
UPDATE diaries
SET content = ?, version = version + 1
WHERE _id = ? AND version = ?; -- 예상 버전 확인
```

### 충돌 감지

```typescript
// Last-Write-Wins 전략
if (affectedRows === 0) {
  // 다른 클라이언트가 먼저 업데이트함
  throw new Error('Data has been modified by another process');
}
```

## 🚨 에러 처리 및 정보 노출 방지

### 커스텀 에러 메시지

```typescript
// ❌ 위험 (내부 정보 노출)
res.status(500).json({
  error: error.message, // "SQLITE_CONSTRAINT: UNIQUE constraint failed"
  stack: error.stack     // 스택 트레이스 노출
});

// ✅ 안전 (일반적인 메시지)
res.status(500).json({
  success: false,
  message: 'An error occurred while processing your request'
});
```

### 로그에만 상세 정보 기록

```typescript
try {
  // 데이터베이스 작업
} catch (error) {
  // 서버 로그 (상세 정보)
  console.error('❌ Database error:', error);

  // 클라이언트 응답 (일반 메시지)
  res.status(500).json({
    success: false,
    message: 'Failed to save diary'
  });
}
```

## 🐛 Sentry 개인정보 보호

### PII 필터링

```typescript
beforeSend(event, hint) {
  // 요청 정보에서 민감 데이터 제거
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
  }

  // 사용자 정보에서 개인정보 제거
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
  }

  return event;
}
```

### 무시할 에러

```typescript
ignoreErrors: [
  'Network request failed',    // 네트워크 단절
  'Network Error',
  'User cancelled',            // 사용자 취소
  'Non-serializable values'    // React Navigation 경고
]
```

## 🔍 취약점 점검 체크리스트

### 서버 보안

- ✅ HTTPS 사용 (Railway 자동 제공)
- ✅ 환경 변수에 민감 정보 저장
- ✅ Rate Limiting 적용
- ✅ CORS 설정 (프로덕션 wildcard 금지)
- ✅ SQL Injection 방어 (Prepared Statements)
- ✅ 에러 메시지 일반화 (내부 정보 노출 방지)

### 데이터 보안

- ✅ AES-256-GCM 암호화 (content, moodTag, aiComment)
- ✅ 암호화 키 환경 변수 저장
- ✅ Soft Delete (데이터 복구 가능)
- ✅ 버전 관리 (충돌 감지)

### 인증/인가

- ✅ Firebase Auth (프로덕션)
- ✅ 개발 모드 (x-user-id 헤더)
- ✅ 관리자 API 보호 (ADMIN_SECRET)
- ✅ 토큰 만료 검증

### 모니터링

- ✅ Sentry 에러 추적
- ✅ PII 필터링
- ✅ 요청 로깅 (디버깅용)
- ⚠️ 로그에 민감 정보 제거 필요

## 🎯 향후 보안 강화 계획

### Phase 1 (현재)
- ✅ AES-256-GCM 암호화
- ✅ Rate Limiting
- ✅ Soft Delete
- ✅ Firebase Auth (준비 완료)

### Phase 2 (프로덕션 전)
- [ ] HTTPS 강제 (HTTP → HTTPS 리다이렉트)
- [ ] Security Headers (Helmet.js)
- [ ] CSP (Content Security Policy)
- [ ] 로그 민감 정보 마스킹

### Phase 3 (스케일링)
- [ ] DDoS 방어 (CloudFlare)
- [ ] WAF (Web Application Firewall)
- [ ] 정기 보안 스캔 (OWASP ZAP)
- [ ] 침투 테스트
