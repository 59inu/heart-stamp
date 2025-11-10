# 서버 아키텍처 (Backend Architecture)

Heart Stamp Diary 백엔드의 설계 원칙과 작동 방식을 설명합니다.

## 🏗️ 전체 구조

```
backend/
├── src/
│   ├── index.ts                  # 서버 진입점
│   ├── config/
│   │   └── firebase.ts          # Firebase Admin 초기화
│   ├── middleware/
│   │   ├── auth.ts              # 인증 미들웨어
│   │   └── rateLimiter.ts       # 레이트 리미팅
│   ├── routes/
│   │   ├── diaryRoutes.ts       # 일기 API
│   │   ├── reportRoutes.ts      # 리포트 API
│   │   └── imageRoutes.ts       # 이미지 업로드 API
│   ├── services/
│   │   ├── database.ts          # SQLite 데이터베이스
│   │   ├── encryptionService.ts # AES-256-GCM 암호화
│   │   ├── claudeService.ts     # Claude AI 통합
│   │   ├── reportService.ts     # 리포트 생성
│   │   ├── s3Service.ts         # S3 이미지 업로드
│   │   ├── pushNotificationService.ts  # 푸시 알림
│   │   └── backupService.ts     # 데이터베이스 백업
│   ├── jobs/
│   │   ├── aiAnalysisJob.ts     # AI 분석 배치 작업
│   │   └── backupJob.ts         # 백업 배치 작업
│   └── utils/
│       ├── envValidator.ts      # 환경 변수 검증
│       ├── errors.ts            # 커스텀 에러 클래스
│       └── retry.ts             # 재시도 로직
├── diary.db                      # SQLite 데이터베이스
├── backups/                      # 로컬 백업 파일
└── uploads/                      # 로컬 이미지 (S3 미사용 시)
```

## 🚀 서버 시작 플로우

```typescript
1. 환경 변수 로드 및 검증
   ↓
2. 암호화 서비스 초기화 (키 검증)
   ↓
3. SQLite 데이터베이스 초기화
   ↓
4. Firebase Admin 초기화
   ↓
5. Claude API 서비스 초기화
   ↓
6. 배치 작업 스케줄러 시작
   ↓
7. Express 서버 시작 (포트 3000)
```

### 서버 시작 로그

```bash
✅ Environment variables validated
📋 Environment Information:
   - NODE_ENV: development
   - Port: 3000
   - Firebase Auth: Disabled (Dev Mode)
   - CORS Origins: *
   - Claude API: Configured
   - Encryption: Custom Key
   - S3 Storage: Enabled

✅ WAL mode enabled for better-sqlite3
✅ SQLite database initialized
✅ Firebase Admin 초기화 완료: heart-stamp-diary
✅ Encryption service initialized
✅ ClaudeService initialized with Circuit Breaker

📔 Heart Stamp Backend - AI-powered diary comments
🚀 Server is running on:
   - Local:   http://localhost:3000
   - Network: http://192.168.0.14:3000
```

## 🛣️ API 라우트 구조

### 일기 API (`/api/diaries`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/diaries` | 필수 | 사용자의 모든 일기 조회 |
| GET | `/api/diaries/:id` | 필수 | 특정 일기 조회 |
| POST | `/api/diaries` | 필수 | 새 일기 작성 |
| PUT | `/api/diaries/:id` | 필수 | 일기 수정 |
| DELETE | `/api/diaries/:id` | 필수 | 일기 삭제 (소프트 삭제) |

### 리포트 API (`/api/reports`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/reports/:period` | 필수 | 주간/월간 리포트 조회 |
| POST | `/api/reports/:period/generate` | 필수 | 리포트 생성 |

### 이미지 API (`/api/images`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/images/upload` | 필수 | 이미지 업로드 (S3) |
| DELETE | `/api/images` | 필수 | 이미지 삭제 (S3) |

### 푸시 알림 API (`/api/push`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/push/register` | 필수 | 푸시 토큰 등록 |
| DELETE | `/api/push/unregister` | 필수 | 푸시 토큰 삭제 |
| POST | `/api/push/test-regular` | Admin | 테스트 알림 전송 |
| POST | `/api/push/test-ai-comment` | Admin | AI 코멘트 알림 테스트 |

### 관리자 API (`/api/jobs`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/jobs/trigger-analysis` | Admin | AI 분석 수동 실행 |
| POST | `/api/jobs/trigger-backup` | Admin | 백업 수동 실행 |
| GET | `/api/jobs/backups` | Admin | 백업 목록 조회 |

## 🔄 요청 처리 플로우

```
1. 클라이언트 요청
   ↓
2. CORS 검증 (origin 체크)
   ↓
3. Rate Limiting (요청 제한)
   ↓
4. 인증 미들웨어 (Firebase Auth 또는 Dev 모드)
   ↓
5. 라우트 핸들러
   ↓
6. 비즈니스 로직 처리
   ↓
7. 데이터베이스 작업 (암호화/복호화)
   ↓
8. 응답 반환
   ↓
9. 에러 발생 시 Sentry로 전송
```

## ⏰ 배치 작업 (Scheduled Jobs)

### AI 분석 작업

```typescript
// aiAnalysisJob.ts

스케줄: 매일 새벽 3시 (cron: '0 3 * * *')

작업 내용:
1. 전날 작성된 일기 중 AI 코멘트 없는 것 조회
2. 각 일기에 대해 Claude API 호출
3. 감정 분석 + 스탬프 추천 + 선생님 코멘트 생성
4. 데이터베이스 업데이트 (암호화 후 저장)
5. 실패 시 재시도 (최대 3회)
```

### 푸시 알림 작업

```typescript
스케줄: 매일 아침 8시 30분 (cron: '30 8 * * *')

작업 내용:
1. 전날 AI 코멘트 받은 사용자 조회
2. 각 사용자에게 푸시 알림 전송
   - 제목: "선생님 코멘트 도착 ✨"
   - 내용: "밤 사이 선생님이 일기를 읽고 코멘트를 남겼어요"
3. 전송 결과 확인 및 실패한 토큰 처리
   - Firebase에서 반환하는 응답(response)으로 성공/실패 확인
   - 유효하지 않은 푸시 토큰은 데이터베이스에서 삭제
```

### 백업 작업

```typescript
스케줄: 매일 새벽 4시 (cron: '0 4 * * *')

작업 내용:
1. SQLite 데이터베이스 복사 (diary.db)
2. 로컬 저장 (./backups/YYYY-MM-DD_diary.db)
3. S3 업로드 (선택 사항)
4. 14일 이상 된 백업 삭제 (로컬 + S3)
```

## 🔌 서비스 간 통신

### 데이터베이스 ↔ 암호화 서비스

```typescript
// 저장 시
DiaryDatabase.create(diary)
  ↓
encryptFields({ content, moodTag, aiComment })
  ↓
SQLite INSERT (암호화된 데이터)

// 조회 시
SQLite SELECT (암호화된 데이터)
  ↓
decryptFields({ content, moodTag, aiComment })
  ↓
평문 데이터 반환
```

### Claude 서비스 ↔ 데이터베이스

```typescript
// AI 분석 플로우
1. DiaryDatabase.getPending() - 분석 대상 조회
   ↓
2. ClaudeService.analyzeDiaryEntry(content, moodTag)
   ↓
3. Claude API 호출 (Haiku 모델)
   ↓
4. 응답 파싱 (stampType, aiComment)
   ↓
5. DiaryDatabase.update(id, { aiComment, stampType })
   ↓
6. 암호화 후 데이터베이스 저장
```

### S3 서비스 ↔ 이미지 라우트

```typescript
// 이미지 업로드 플로우
1. 클라이언트에서 Base64 이미지 전송
   ↓
2. Buffer로 변환
   ↓
3. S3Service.uploadImage(buffer, filename)
   ↓
4. S3 업로드 (UUID 파일명)
   ↓
5. S3 URL 반환
   ↓
6. 데이터베이스에 URL 저장 (imageUri)
```

## 🛡️ 에러 처리

### 커스텀 에러 클래스

```typescript
DatabaseError          // 일반 데이터베이스 에러
├── DuplicateKeyError    // 중복 키 에러
├── DiskFullError        // 디스크 풀
├── DatabaseLockError    // 데이터베이스 잠김
└── DatabaseCorruptError // 데이터베이스 손상
```

### 재시도 전략

```typescript
// SQLITE_BUSY 에러 재시도
retryOnBusy(operation, maxRetries=3)
  ↓
시도 1: 실패 → 100ms 대기
시도 2: 실패 → 200ms 대기
시도 3: 실패 → 300ms 대기
시도 4: DatabaseLockError 발생
```

### Circuit Breaker (Claude API)

```typescript
상태: CLOSED (정상)
  ↓ 5회 연속 실패
상태: OPEN (차단)
  ↓ 60초 대기
상태: HALF_OPEN (테스트)
  ↓ 1회 성공
상태: CLOSED (정상 복귀)
```

## 📊 성능 최적화

### SQLite 최적화

```sql
-- WAL 모드 (Write-Ahead Logging)
PRAGMA journal_mode = WAL;

-- 동기화 모드 (WAL과 함께 사용 시 안전)
PRAGMA synchronous = NORMAL;

-- 캐시 크기 (64MB)
PRAGMA cache_size = -64000;

-- Busy 타임아웃 (5초)
PRAGMA busy_timeout = 5000;
```

### 인덱스

```sql
-- 사용자별 조회 성능 향상
CREATE INDEX idx_userId ON diaries(userId);

-- 소프트 삭제 쿼리 성능 향상
CREATE INDEX idx_deletedAt ON diaries(deletedAt);
```

### 연결 풀링

- SQLite는 단일 파일 DB이므로 연결 풀링 불필요
- Better-sqlite3가 내부적으로 동기 작업 최적화

## 🔍 모니터링 및 로깅

### 요청 로깅

```typescript
📥 [2025-11-08T12:34:56.789Z] POST /api/diaries
   Headers: { authorization: 'Bearer ...', x-user-id: 'user123' }
   Body: { date: '2025-11-08', content: '...', mood: 'happy' }
```

### 에러 로깅

```typescript
❌ [DiaryDatabase] Failed to create diary
   Error: SQLITE_CONSTRAINT_PRIMARYKEY
   Details: { entryId: '123-456-789' }
```

### 성공 로깅

```typescript
✅ [Claude API] Diary analyzed successfully
   Entry: 123-456-789
   Stamp: stamp-happy
   Comment: "오늘 하루도 긍정적인 에너지로 가득했네요! 😊"
```

## 🌐 CORS 설정

### 개발 모드

```typescript
ALLOWED_ORIGINS=*
→ 모든 오리진 허용 (TestFlight 테스트용)
```

### 프로덕션 모드

```typescript
ALLOWED_ORIGINS=https://app.heartstampdiary.com
→ 특정 도메인만 허용

// 여러 도메인
ALLOWED_ORIGINS=https://app.com,https://admin.com
```

## 📦 의존성 관리

### 주요 패키지

```json
{
  "express": "^4.18.2",           // 웹 프레임워크
  "better-sqlite3": "^9.2.0",     // SQLite 데이터베이스
  "@anthropic-ai/sdk": "^0.32.1", // Claude API
  "@aws-sdk/client-s3": "^3.0.0", // S3 이미지 업로드
  "firebase-admin": "^12.0.0",    // Firebase 푸시 알림
  "node-cron": "^3.0.3",          // 배치 작업 스케줄러
  "express-rate-limit": "^7.0.0"  // 레이트 리미팅
}
```

## 🔄 배포 워크플로우

```
1. GitHub에 코드 push (main 브랜치)
   ↓
2. Railway 자동 감지
   ↓
3. npm install (의존성 설치)
   ↓
4. npm run build (TypeScript 컴파일)
   ↓
5. npm start (서버 시작)
   ↓
6. 헬스 체크 성공
   ↓
7. 배포 완료 🎉
```
