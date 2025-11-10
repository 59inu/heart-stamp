# 데이터베이스 설계 (Database Design)

Heart Stamp Diary의 데이터베이스 구조 및 관리 전략을 설명합니다.

## 🗄️ 데이터베이스 선택

**SQLite + Better-sqlite3**

### 선택 이유

| 요구사항 | SQLite 장점 |
|---------|-----------|
| **심플함** | 별도 서버 불필요, 파일 기반 |
| **성능** | 인메모리 수준의 빠른 읽기 |
| **안정성** | ACID 트랜잭션 보장 |
| **백업** | 파일 복사만으로 백업 가능 |
| **비용** | 무료, 추가 인프라 불필요 |

### Better-sqlite3 vs 기본 SQLite

```typescript
// Better-sqlite3: 동기 API (간결함)
const row = db.prepare('SELECT * FROM diaries WHERE _id = ?').get(id);

// 기본 SQLite: 비동기 API (복잡함)
db.get('SELECT * FROM diaries WHERE _id = ?', [id], (err, row) => {
  // ...
});
```

## 📊 테이블 구조

### Diaries 테이블

```sql
CREATE TABLE diaries (
  _id TEXT PRIMARY KEY,           -- UUID v4 (클라이언트 생성)
  userId TEXT NOT NULL,            -- 사용자 ID
  date TEXT NOT NULL,              -- 일기 날짜 (YYYY-MM-DD)
  content TEXT NOT NULL,           -- 일기 내용 (암호화)
  weather TEXT,                    -- 날씨 (sunny, cloudy, rainy, snowy)
  mood TEXT,                       -- 감정 (happy, sad, angry, etc.)
  moodTag TEXT,                    -- 감정 태그 (암호화)
  aiComment TEXT,                  -- AI 코멘트 (암호화)
  stampType TEXT,                  -- 스탬프 타입 (stamp-happy, etc.)
  createdAt TEXT NOT NULL,         -- 생성 시간 (ISO 8601)
  updatedAt TEXT NOT NULL,         -- 수정 시간 (ISO 8601)
  syncedWithServer INTEGER DEFAULT 0,  -- 서버 동기화 여부 (0/1)
  deletedAt TEXT,                  -- 삭제 시간 (소프트 삭제)
  version INTEGER DEFAULT 1        -- 버전 (충돌 해결)
);
```

### Push Tokens 테이블

```sql
CREATE TABLE push_tokens (
  userId TEXT PRIMARY KEY,         -- 사용자 ID (PK)
  token TEXT NOT NULL,             -- Expo Push Token
  createdAt TEXT NOT NULL,         -- 생성 시간
  updatedAt TEXT NOT NULL,         -- 수정 시간
  deletedAt TEXT,                  -- 삭제 시간 (소프트 삭제)
  version INTEGER DEFAULT 1        -- 버전
);
```

### Reports 테이블

```sql
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,            -- 사용자 ID
  period TEXT NOT NULL,            -- 기간 (week/month)
  startDate TEXT NOT NULL,         -- 시작 날짜
  endDate TEXT NOT NULL,           -- 종료 날짜
  summary TEXT NOT NULL,           -- 요약 (JSON)
  createdAt TEXT NOT NULL,         -- 생성 시간
  updatedAt TEXT NOT NULL,         -- 수정 시간
  deletedAt TEXT,                  -- 삭제 시간
  version INTEGER DEFAULT 1        -- 버전
);
```

## 🔍 인덱스 설계

### 성능 최적화 인덱스

```sql
-- userId로 일기 조회 (가장 빈번한 쿼리)
CREATE INDEX idx_userId ON diaries(userId);

-- 소프트 삭제 쿼리 최적화
CREATE INDEX idx_deletedAt ON diaries(deletedAt);

-- 복합 인덱스 (추가 고려)
CREATE INDEX idx_userId_date ON diaries(userId, date);
CREATE INDEX idx_userId_deletedAt ON diaries(userId, deletedAt);
```

### 인덱스 효과

```sql
-- 인덱스 없을 때: SCAN TABLE diaries (전체 테이블 스캔)
SELECT * FROM diaries WHERE userId = 'user123';

-- 인덱스 있을 때: SEARCH TABLE diaries USING INDEX idx_userId (인덱스 검색)
EXPLAIN QUERY PLAN
SELECT * FROM diaries WHERE userId = 'user123';
```

## ⚙️ SQLite 최적화

### WAL 모드 (Write-Ahead Logging)

```typescript
db.pragma('journal_mode = WAL');
```

**장점**:
- ✅ 동시 읽기/쓰기 가능 (Reader-Writer 동시성)
- ✅ 쓰기 성능 향상 (디스크 I/O 감소)
- ✅ 데이터 무결성 보장

**작동 방식**:
```
일반 모드:
  쓰기 → 전체 잠금 → 읽기 차단

WAL 모드:
  쓰기 → WAL 파일에 기록 → 읽기 계속 가능
  체크포인트 → WAL → 메인 DB 병합
```

### 동기화 모드

```typescript
db.pragma('synchronous = NORMAL');
```

| 모드 | 안전성 | 성능 | 설명 |
|------|--------|------|------|
| **FULL** | 최고 | 낮음 | 모든 쓰기마다 fsync |
| **NORMAL** | 높음 | 중간 | WAL과 함께 사용 시 안전 |
| **OFF** | 낮음 | 최고 | 전원 꺼지면 손실 가능 |

**선택 이유**: WAL + NORMAL = 안전하면서도 빠름

### 캐시 크기

```typescript
db.pragma('cache_size = -64000'); // 64MB
```

**기본값**: 2000 페이지 (~2MB)
**권장값**: 64000 페이지 (~64MB)

### Busy 타임아웃

```typescript
db.pragma('busy_timeout = 5000'); // 5초
```

**작동 방식**:
- 데이터베이스가 잠겨있으면 5초간 대기
- 5초 내에 해제되면 작업 진행
- 5초 후에도 잠겨있으면 `SQLITE_BUSY` 에러

## 🔐 암호화 통합

### 암호화 대상 필드

```typescript
const ENCRYPTED_FIELDS = ['content', 'moodTag', 'aiComment'];
```

### 저장 플로우

```typescript
// 1. 평문 데이터
const diary = {
  content: "오늘은 정말 행복한 하루였어요!",
  moodTag: "기쁨, 설렘",
  aiComment: "긍정적인 에너지가 느껴져요 😊"
};

// 2. 암호화
const encrypted = encryptFields(diary);
// {
//   content: "iv:authTag:ciphertext",
//   moodTag: "iv:authTag:ciphertext",
//   aiComment: "iv:authTag:ciphertext"
// }

// 3. 데이터베이스 저장
INSERT INTO diaries (..., content, moodTag, aiComment, ...)
VALUES (..., ?, ?, ?, ...);
```

### 조회 플로우

```typescript
// 1. 데이터베이스 조회
SELECT * FROM diaries WHERE _id = ?;
// {
//   content: "iv:authTag:ciphertext",
//   moodTag: "iv:authTag:ciphertext",
//   aiComment: "iv:authTag:ciphertext"
// }

// 2. 복호화
const decrypted = decryptFields(row);
// {
//   content: "오늘은 정말 행복한 하루였어요!",
//   moodTag: "기쁨, 설렘",
//   aiComment: "긍정적인 에너지가 느껴져요 😊"
// }

// 3. 반환
return decrypted;
```

## 🔄 동시성 제어

### Optimistic Locking (낙관적 잠금)

```typescript
// 버전 기반 업데이트
UPDATE diaries
SET content = ?,
    updatedAt = ?,
    version = version + 1
WHERE _id = ? AND version = ?; -- 현재 버전 확인

// 영향받은 행이 0이면 충돌 발생
if (affectedRows === 0) {
  throw new Error('Data has been modified by another process');
}
```

### SQLITE_BUSY 재시도

```typescript
private static async retryOnBusy<T>(
  fn: () => T,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (error: any) {
      if (error.code === 'SQLITE_BUSY' && attempt < maxRetries) {
        const delay = 100 * (attempt + 1); // 100ms, 200ms, 300ms
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

## 🗑️ 데이터 삭제 전략

### Soft Delete (소프트 삭제)

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

### Hard Delete (완전 삭제)

```sql
-- 30일 후 완전 삭제 (배치 작업)
DELETE FROM diaries
WHERE deletedAt IS NOT NULL
  AND deletedAt < datetime('now', '-30 days');
```

### 복구 API (관리자용)

```typescript
// POST /api/admin/restore/:id
UPDATE diaries
SET deletedAt = NULL,
    updatedAt = datetime('now'),
    version = version + 1
WHERE _id = ?;
```

## 📦 데이터베이스 백업

### 자동 백업

```typescript
// 매일 새벽 4시 실행
schedule: '0 4 * * *'

1. SQLite 파일 복사
   diary.db → backups/YYYY-MM-DD_diary.db

2. S3 업로드 (선택)
   backups/YYYY-MM-DD_diary.db → S3

3. 14일 이상 된 백업 삭제
   로컬: rm backups/old-*.db
   S3: DELETE old backups
```

### 수동 백업

```bash
# 관리자 API
POST /api/jobs/trigger-backup
Header: x-admin-token: <ADMIN_SECRET>

# 응답
{
  "success": true,
  "message": "Backup triggered successfully"
}
```

### 백업 복원

```bash
# Railway 대시보드에서 직접 복원
1. 백업 파일 다운로드 (S3 또는 로컬)
2. Railway에 업로드
3. 서버 재시작
```

## 🔧 마이그레이션 전략

### 컬럼 추가

```typescript
try {
  db.exec(`ALTER TABLE diaries ADD COLUMN newColumn TEXT`);
  console.log('✅ Added newColumn');
} catch (error) {
  // 컬럼이 이미 존재하면 무시
  console.log('⚠️ newColumn already exists');
}
```

### 데이터 변환

```typescript
// 평문 → 암호화 마이그레이션
const unencryptedDiaries = db.prepare(
  'SELECT * FROM diaries WHERE content NOT LIKE "%:%"'
).all();

for (const diary of unencryptedDiaries) {
  const encrypted = encryptFields(diary);
  db.prepare(`
    UPDATE diaries
    SET content = ?, moodTag = ?, aiComment = ?
    WHERE _id = ?
  `).run(encrypted.content, encrypted.moodTag, encrypted.aiComment, diary._id);
}
```

## 📊 쿼리 최적화

### 실행 계획 분석

```sql
-- 쿼리 최적화 전
EXPLAIN QUERY PLAN
SELECT * FROM diaries WHERE userId = 'user123';
-- SCAN TABLE diaries (느림)

-- 인덱스 추가 후
CREATE INDEX idx_userId ON diaries(userId);

EXPLAIN QUERY PLAN
SELECT * FROM diaries WHERE userId = 'user123';
-- SEARCH TABLE diaries USING INDEX idx_userId (빠름)
```

### N+1 문제 방지

```typescript
// ❌ N+1 쿼리 (느림)
const users = db.prepare('SELECT * FROM users').all();
for (const user of users) {
  const diaries = db.prepare('SELECT * FROM diaries WHERE userId = ?').all(user.id);
}

// ✅ JOIN 또는 IN 사용 (빠름)
const userIds = users.map(u => u.id);
const diaries = db.prepare(`
  SELECT * FROM diaries
  WHERE userId IN (${userIds.map(() => '?').join(',')})
`).all(...userIds);
```

## 🔍 트러블슈팅

### SQLITE_BUSY 에러

```typescript
Error: SQLITE_BUSY: database is locked

원인:
- 동시 쓰기 시도
- 긴 트랜잭션 실행 중

해결:
1. WAL 모드 활성화 (journal_mode = WAL)
2. Busy timeout 증가 (busy_timeout = 5000)
3. 재시도 로직 구현 (retryOnBusy)
```

### SQLITE_CORRUPT 에러

```typescript
Error: SQLITE_CORRUPT: database disk image is malformed

원인:
- 디스크 오류
- 전원 갑작스런 차단
- 파일 시스템 문제

해결:
1. 백업에서 복원
2. PRAGMA integrity_check 실행
3. .recover 명령어 사용 (SQLite 3.37+)
```

### 디스크 풀 (SQLITE_FULL)

```typescript
Error: SQLITE_FULL: database or disk is full

원인:
- 디스크 공간 부족
- temp 디렉토리 부족

해결:
1. 오래된 백업 삭제
2. 오래된 일기 완전 삭제 (30일+)
3. 이미지를 S3로 이동 (로컬 저장 제거)
```

## 📈 성능 벤치마크

### 일기 조회 (100개)

| 최적화 | 시간 | 개선율 |
|--------|------|--------|
| 인덱스 없음 | 150ms | - |
| idx_userId | 15ms | 90% ↓ |
| WAL 모드 | 12ms | 92% ↓ |
| 캐시 64MB | 8ms | 95% ↓ |

### 일기 저장 (배치 100개)

| 최적화 | 시간 | 개선율 |
|--------|------|--------|
| 개별 INSERT | 500ms | - |
| 트랜잭션 | 50ms | 90% ↓ |
| Prepared Statement | 40ms | 92% ↓ |

## 🎯 향후 계획

### Phase 1 (현재)
- ✅ SQLite + WAL 모드
- ✅ 암호화 (AES-256-GCM)
- ✅ 소프트 삭제
- ✅ 자동 백업

### Phase 2 (스케일링)
- [ ] PostgreSQL 마이그레이션 (선택)
- [ ] 읽기 전용 복제본 (Read Replica)
- [ ] 연결 풀링
- [ ] 쿼리 캐싱 (Redis)

### Phase 3 (고급 기능)
- [ ] Full-text Search (FTS5)
- [ ] 실시간 동기화 (WebSocket)
- [ ] 오프라인 우선 (Offline-First)
- [ ] 충돌 해결 (CRDT)
