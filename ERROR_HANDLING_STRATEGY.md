# 에러 핸들링 전략 (Error Handling Strategy)

## 📋 목차
1. [현재 상황 분석](#현재-상황-분석)
2. [취약점 및 개선 필요 영역](#취약점-및-개선-필요-영역)
3. [에러 핸들링 전략](#에러-핸들링-전략)
4. [우선순위별 개선 계획](#우선순위별-개선-계획)
5. [구현 예시](#구현-예시)

---

## 현재 상황 분석

### ✅ 잘 되어 있는 부분

#### 1. 백엔드 기본 구조
```typescript
// 대부분의 라우트에 try-catch 적용
try {
  // 비즈니스 로직
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({ success: false, message: 'Failed' });
}
```

#### 2. 입력 검증 (express-validator)
```typescript
// 모든 입력에 대한 검증
body('content').isString().trim().isLength({ min: 1, max: 10000 })
body('date').isISO8601()
body('mood').optional().isIn(['red', 'yellow', 'green'])
```

#### 3. 레이트 리미팅
- 일반 API: 15분당 100회
- AI 분석 API: 1시간당 10회
- 관리자 API: 15분당 5회

#### 4. 인증/인가
- Admin Secret 토큰 검증
- User ID 헤더 검증

---

## 취약점 및 개선 필요 영역

### 🚨 Critical (즉시 개선 필요)

#### 1. **Claude API 에러 핸들링 부재**
**위치**: `backend/src/services/claudeService.ts`

**문제점**:
```typescript
async analyzeDiary(diaryContent: string, date: string): Promise<AIAnalysisResult> {
  // 에러 핸들링 없음 ❌
  // API 호출 실패, 타임아웃, 레이트리밋 등 처리 안 됨
}
```

**위험성**:
- Claude API 장애 시 전체 AI 분석 중단
- 배치 작업 실패 가능성
- 사용자가 코멘트를 받지 못함

---

#### 2. **데이터베이스 에러 핸들링 부재**
**위치**: `backend/src/services/database.ts`

**문제점**:
```typescript
static create(diary: DiaryEntry): DiaryEntry {
  const stmt = db.prepare(`INSERT INTO...`);
  stmt.run(...); // 에러 핸들링 없음 ❌
  return diary;
}
```

**위험성**:
- 중복 키 에러
- 디스크 공간 부족
- 데이터베이스 파일 손상
- SQLite 잠금 타임아웃

---

#### 3. **푸시 알림 실패 처리 부족**
**위치**: `backend/src/services/pushNotificationService.ts`

**문제점**:
```typescript
static async sendNotification(userId: string, ...) {
  try {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    console.log('📤 Push sent'); // 에러 핸들링 부족
    return true;
  } catch (error) {
    console.error('❌ Failed:', error);
    return false; // 실패 원인 불명확
  }
}
```

**위험성**:
- 잘못된 토큰으로 계속 시도
- 만료된 토큰 정리 안 됨
- Receipt 확인 없음 (실제 전송 실패 여부 모름)

---

#### 4. **백업 실패 시 복구 전략 없음**
**위치**: `backend/src/services/backupService.ts`

**문제점**:
```typescript
static async performFullBackup(): Promise<void> {
  try {
    await this.performDatabaseBackup(timestamp);
    await this.performUploadsBackup(timestamp);
    this.cleanOldBackups(); // 에러 시 부분 백업 남음
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error; // 정리 작업 없음
  }
}
```

**위험성**:
- 부분 백업 파일이 남아 디스크 낭비
- 백업 실패 알림 없음
- 복구 불가능한 상태 발생 가능

---

### ⚠️ High (조만간 개선 필요)

#### 5. **프론트엔드 네트워크 에러 처리 부족**
**위치**: `src/services/apiService.ts`, `src/services/diaryStorage.ts`

**문제점**:
```typescript
// 네트워크 에러 시 재시도 로직 없음
// 타임아웃 설정 없음
// 오프라인 모드 지원 없음
```

**위험성**:
- 네트워크 불안정 시 일기 업로드 실패
- 사용자에게 명확한 에러 메시지 없음
- 오프라인에서 작성한 일기 동기화 실패

---

#### 6. **이미지 업로드 검증 부족**
**위치**: `backend/src/routes/imageRoutes.ts`

**문제점**:
```typescript
// 이미지 파일 크기만 검증 (2MB)
// 파일 내용 검증 없음
// 악성 파일 검사 없음
```

**위험성**:
- 실제 이미지가 아닌 파일 업로드 가능
- 디스크 공간 악용 가능성

---

#### 7. **배치 작업 실패 시 알림 없음**
**위치**: `backend/src/jobs/aiAnalysisJob.ts`, `backend/src/jobs/backupJob.ts`

**문제점**:
```typescript
cron.schedule('0 3 * * *', async () => {
  try {
    await this.runBatchAnalysis();
  } catch (error) {
    console.error('❌ Failed:', error);
    // 관리자 알림 없음
  }
});
```

**위험성**:
- 배치 작업 실패를 모르고 지나갈 수 있음
- 여러 날 코멘트가 안 달릴 수 있음

---

### 📝 Medium (장기적 개선)

#### 8. **로깅 시스템 부재**
- 모든 에러가 console.error로만 출력
- 로그 파일 없음
- 로그 레벨 구분 없음

#### 9. **모니터링 시스템 없음**
- 서버 상태 모니터링 없음
- 에러 발생률 추적 없음
- 성능 메트릭 수집 없음

#### 10. **에러 메시지 일관성 부족**
```typescript
// 일관성 없는 에러 메시지
"Failed to upload diary"
"Failed to get AI comment"
"Failed to analyze diary"
```

---

## 에러 핸들링 전략

### 1. 에러 분류 체계

#### Level 1: Critical Errors (즉시 조치)
- 데이터베이스 연결 실패
- 데이터 손실 위험
- 서비스 전체 중단

**대응**:
- 관리자에게 즉시 알림 (이메일/SMS)
- 자동 재시도 + 폴백
- 상세 로그 기록

#### Level 2: High Errors (빠른 조치)
- API 호출 실패 (Claude, Expo)
- 배치 작업 실패
- 파일 시스템 에러

**대응**:
- 관리자 알림 (이메일)
- 재시도 로직
- 에러 로그 기록

#### Level 3: Medium Errors (모니터링)
- 네트워크 타임아웃
- 입력 검증 실패
- 레이트리밋 도달

**대응**:
- 사용자에게 명확한 메시지
- 에러 카운트 추적
- 로그 기록

#### Level 4: Low Errors (기록만)
- 요청 형식 오류
- 인증 실패
- 없는 리소스 접근

**대응**:
- 표준 HTTP 에러 응답
- 로그 기록

---

### 2. 백엔드 에러 핸들링 패턴

#### 표준 에러 응답 형식
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;          // 에러 코드 (ERR_DATABASE_CONNECTION)
    message: string;        // 사용자용 메시지
    details?: string;       // 개발자용 상세 정보
    timestamp: string;      // ISO 8601 타임스탬프
    requestId?: string;     // 추적용 요청 ID
  };
}
```

#### 에러 클래스 정의
```typescript
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public level: 'critical' | 'high' | 'medium' | 'low',
    public details?: any
  ) {
    super(message);
  }
}

class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super('ERR_DATABASE', message, 500, 'critical', details);
  }
}

class ClaudeAPIError extends AppError {
  constructor(message: string, details?: any) {
    super('ERR_CLAUDE_API', message, 503, 'high', details);
  }
}
```

---

### 3. 재시도 전략

#### Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1분
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      console.error('⚠️ Circuit breaker opened!');
    }
  }
}
```

---

### 4. 프론트엔드 에러 핸들링

#### 사용자 친화적 에러 메시지
```typescript
const ERROR_MESSAGES = {
  NETWORK_ERROR: '인터넷 연결을 확인해주세요',
  TIMEOUT: '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요',
  SERVER_ERROR: '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요',
  VALIDATION_ERROR: '입력 내용을 확인해주세요',
  NOT_FOUND: '요청하신 내용을 찾을 수 없습니다',
  RATE_LIMIT: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요',
};
```

#### 오프라인 지원
```typescript
// 네트워크 상태 감지
import NetInfo from '@react-native-community/netinfo';

const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOnline(state.isConnected ?? false);
  });
  return () => unsubscribe();
}, []);

// 오프라인 시 로컬에만 저장
if (!isOnline) {
  await DiaryStorage.save(diary);
  Alert.alert(
    '오프라인 모드',
    '일기가 기기에 저장되었습니다. 인터넷 연결 시 자동으로 동기화됩니다.'
  );
  return;
}
```

---

## 우선순위별 개선 계획

### 🔴 Phase 1: Critical Issues (1-2주)

1. **Claude API 에러 핸들링**
   - [ ] ClaudeService에 try-catch 추가
   - [ ] 재시도 로직 구현
   - [ ] 타임아웃 설정 (30초)
   - [ ] Circuit Breaker 패턴 적용

2. **데이터베이스 에러 핸들링**
   - [ ] 모든 DB 작업에 try-catch
   - [ ] 중복 키 에러 처리
   - [ ] SQLite 잠금 타임아웃 처리
   - [ ] 트랜잭션 롤백 구현

3. **푸시 알림 개선**
   - [ ] 만료/잘못된 토큰 정리
   - [ ] Receipt 확인 로직
   - [ ] 재시도 전략

### 🟡 Phase 2: High Priority (2-4주)

4. **프론트엔드 네트워크 에러 처리**
   - [ ] 재시도 로직
   - [ ] 타임아웃 설정
   - [ ] 오프라인 모드 지원
   - [ ] 동기화 큐 구현

5. **배치 작업 모니터링**
   - [ ] 실패 시 관리자 알림
   - [ ] 성공/실패 메트릭 기록
   - [ ] 재시도 로직

6. **이미지 업로드 검증**
   - [ ] 파일 내용 검증 (magic number)
   - [ ] 이미지 크기 제한 강화
   - [ ] 파일명 sanitization

### 🟢 Phase 3: Medium Priority (1-2개월)

7. **로깅 시스템**
   - [ ] Winston 도입
   - [ ] 로그 레벨 구분
   - [ ] 로그 파일 rotation
   - [ ] 에러 추적 (Sentry 검토)

8. **모니터링 시스템**
   - [ ] Health check 엔드포인트 강화
   - [ ] 에러 발생률 추적
   - [ ] 성능 메트릭 수집

9. **에러 메시지 표준화**
   - [ ] 에러 코드 체계 정립
   - [ ] 다국어 지원 준비
   - [ ] 사용자 친화적 메시지

---

## 구현 예시

### 1. Claude API 에러 핸들링

```typescript
// backend/src/services/claudeService.ts

import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisResult, StampType } from '../types/diary';

class ClaudeAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ClaudeAPIError';
  }
}

export class ClaudeService {
  private client: Anthropic;
  private circuitBreaker: CircuitBreaker;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  async analyzeDiary(
    diaryContent: string,
    date: string
  ): Promise<AIAnalysisResult> {
    // Circuit breaker로 보호
    return this.circuitBreaker.execute(async () => {
      // 재시도 로직 적용
      return retryWithBackoff(
        async () => this.performAnalysis(diaryContent, date),
        3,  // 최대 3번 재시도
        1000  // 1초부터 시작
      );
    });
  }

  private async performAnalysis(
    diaryContent: string,
    date: string
  ): Promise<AIAnalysisResult> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: this.buildPrompt(diaryContent, date)
        }],
      }, {
        // 타임아웃 설정 (30초)
        timeout: 30000,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new ClaudeAPIError('Unexpected response type');
      }

      return this.parseResponse(content.text);

    } catch (error: any) {
      // Anthropic API 에러 타입별 처리
      if (error.status === 429) {
        // Rate limit
        throw new ClaudeAPIError(
          'Claude API rate limit exceeded',
          429,
          error
        );
      } else if (error.status === 500 || error.status === 503) {
        // 서버 에러 - 재시도 가능
        throw new ClaudeAPIError(
          'Claude API server error',
          error.status,
          error
        );
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        // 타임아웃
        throw new ClaudeAPIError(
          'Claude API timeout',
          408,
          error
        );
      } else if (error.status === 401) {
        // 인증 에러 - 재시도 불가
        console.error('❌ Claude API authentication failed');
        throw new ClaudeAPIError(
          'Claude API authentication failed',
          401,
          error
        );
      }

      // 기타 에러
      console.error('❌ Claude API unknown error:', error);
      throw new ClaudeAPIError(
        'Claude API request failed',
        500,
        error
      );
    }
  }

  private buildPrompt(diaryContent: string, date: string): string {
    return `당신은 따뜻한 초등학교 담임 선생님입니다.
학생의 일기를 읽고 3-4줄로 구체적이고 깊이 있게 반응해주세요.

[규칙 생략...]

일기 날짜: ${date}
일기 내용:
${diaryContent}

응답 형식:
COMMENT: [코멘트 내용]
STAMP: [excellent/good/nice/keep_going 중 하나]`;
  }

  private parseResponse(response: string): AIAnalysisResult {
    try {
      const commentMatch = response.match(/COMMENT:\s*(.+?)(?=\nSTAMP:|$)/s);
      const stampMatch = response.match(/STAMP:\s*(\w+)/);

      if (!commentMatch || !stampMatch) {
        console.warn('⚠️ Failed to parse Claude response, using fallback');
        return this.getFallbackResponse();
      }

      const comment = commentMatch[1].trim();
      const stampType = this.parseStampType(stampMatch[1].trim());

      return { comment, stampType };

    } catch (error) {
      console.error('❌ Error parsing Claude response:', error);
      return this.getFallbackResponse();
    }
  }

  private getFallbackResponse(): AIAnalysisResult {
    return {
      comment: '오늘도 일기를 작성해주었네요! 매일 기록하는 습관이 참 좋아요.',
      stampType: 'nice',
    };
  }

  private parseStampType(stamp: string): StampType {
    const normalizedStamp = stamp.toLowerCase();
    if (['excellent', 'good', 'nice', 'keep_going'].includes(normalizedStamp)) {
      return normalizedStamp as StampType;
    }
    console.warn(`⚠️ Unknown stamp type: ${stamp}, using 'nice' as fallback`);
    return 'nice';
  }
}
```

---

### 2. 데이터베이스 에러 핸들링

```typescript
// backend/src/services/database.ts

import Database from 'better-sqlite3';
import { DiaryEntry } from '../types/diary';

class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DiaryDatabase {
  static create(diary: DiaryEntry): DiaryEntry {
    try {
      const stmt = db.prepare(`
        INSERT INTO diaries (
          _id, userId, date, content, weather, mood, moodTag,
          aiComment, stampType, createdAt, updatedAt,
          syncedWithServer, version
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        diary._id,
        diary.userId || 'unknown',
        diary.date,
        diary.content,
        diary.weather || null,
        diary.mood || null,
        diary.moodTag || null,
        diary.aiComment || null,
        diary.stampType || null,
        diary.createdAt,
        diary.updatedAt,
        diary.syncedWithServer ? 1 : 0,
        diary.version || 1
      );

      return diary;

    } catch (error: any) {
      // SQLite 에러 코드 처리
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new DatabaseError(
          `Diary with ID ${diary._id} already exists`,
          'DUPLICATE_KEY',
          error
        );
      } else if (error.code === 'SQLITE_FULL') {
        throw new DatabaseError(
          'Database disk is full',
          'DISK_FULL',
          error
        );
      } else if (error.code === 'SQLITE_BUSY') {
        // 타임아웃 재시도
        console.warn('⚠️ Database is busy, retrying...');
        return this.createWithRetry(diary, 3);
      } else if (error.code === 'SQLITE_CORRUPT') {
        throw new DatabaseError(
          'Database file is corrupted',
          'DATABASE_CORRUPT',
          error
        );
      }

      // 기타 에러
      console.error('❌ Database error:', error);
      throw new DatabaseError(
        'Failed to create diary entry',
        'DATABASE_ERROR',
        error
      );
    }
  }

  private static createWithRetry(
    diary: DiaryEntry,
    maxRetries: number
  ): DiaryEntry {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // 짧은 대기 후 재시도
        const delay = 100 * (i + 1);
        const sleep = (ms: number) =>
          new Promise(resolve => setTimeout(resolve, ms));

        sleep(delay);
        return this.create(diary);

      } catch (error: any) {
        if (error.code !== 'SQLITE_BUSY' || i === maxRetries - 1) {
          throw error;
        }
      }
    }

    throw new DatabaseError(
      'Database busy timeout exceeded',
      'DATABASE_TIMEOUT'
    );
  }

  static update(id: string, updates: Partial<DiaryEntry>): void {
    try {
      // [update 로직 생략...]

    } catch (error: any) {
      if (error.code === 'SQLITE_BUSY') {
        console.warn('⚠️ Database is busy during update, retrying...');
        this.updateWithRetry(id, updates, 3);
      } else {
        console.error('❌ Database update error:', error);
        throw new DatabaseError(
          `Failed to update diary ${id}`,
          'DATABASE_ERROR',
          error
        );
      }
    }
  }

  // [기타 메서드들...]
}
```

---

### 3. 푸시 알림 개선

```typescript
// backend/src/services/pushNotificationService.ts

import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { PushTokenDatabase } from './database';

const expo = new Expo();

interface PushError {
  userId: string;
  error: string;
  details?: any;
}

export class PushNotificationService {
  /**
   * 푸시 알림 전송 (Receipt 확인 포함)
   */
  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = PushTokenDatabase.get(userId);

      if (!token) {
        console.log(`⚠️ No push token for user ${userId}`);
        return { success: false, error: 'NO_TOKEN' };
      }

      // 토큰 유효성 검사
      if (!Expo.isExpoPushToken(token)) {
        console.error(`❌ Invalid token for user ${userId}: ${token}`);
        // 잘못된 토큰 삭제
        PushTokenDatabase.delete(userId);
        return { success: false, error: 'INVALID_TOKEN' };
      }

      const message: ExpoPushMessage = {
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      };

      // 1단계: 푸시 전송
      const chunks = expo.chunkPushNotifications([message]);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      // 2단계: Ticket 확인
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`❌ Push ticket error for ${userId}:`, ticket);

          // DeviceNotRegistered 에러 시 토큰 삭제
          if (ticket.details?.error === 'DeviceNotRegistered') {
            console.log(`🗑️ Removing unregistered token for user ${userId}`);
            PushTokenDatabase.delete(userId);
          }

          return {
            success: false,
            error: ticket.details?.error || 'TICKET_ERROR'
          };
        }
      }

      // 3단계: Receipt 확인 (15초 후)
      await new Promise(resolve => setTimeout(resolve, 15000));

      const receiptIds = tickets
        .filter(ticket => ticket.status === 'ok')
        .map(ticket => ticket.id);

      if (receiptIds.length > 0) {
        const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);

        for (const receiptId in receipts) {
          const receipt = receipts[receiptId] as ExpoPushReceipt;

          if (receipt.status === 'error') {
            console.error(`❌ Push receipt error for ${userId}:`, receipt);

            // DeviceNotRegistered 에러 시 토큰 삭제
            if (receipt.details?.error === 'DeviceNotRegistered') {
              console.log(`🗑️ Removing unregistered token for user ${userId}`);
              PushTokenDatabase.delete(userId);
            }

            return {
              success: false,
              error: receipt.details?.error || 'RECEIPT_ERROR'
            };
          }
        }
      }

      console.log(`✅ Push notification sent to user ${userId}`);
      return { success: true };

    } catch (error: any) {
      console.error(`❌ Failed to send push to user ${userId}:`, error);
      return {
        success: false,
        error: error.message || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * 여러 사용자에게 푸시 전송 (에러 수집)
   */
  static async sendNotificationToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: any
  ): Promise<{ successCount: number; errors: PushError[] }> {
    console.log(`📤 Sending push to ${userIds.length} users...`);

    let successCount = 0;
    const errors: PushError[] = [];

    for (const userId of userIds) {
      const result = await this.sendNotification(userId, title, body, data);

      if (result.success) {
        successCount++;
      } else {
        errors.push({
          userId,
          error: result.error || 'UNKNOWN',
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(
      `✅ Push notifications: ${successCount} succeeded, ${errors.length} failed`
    );

    // 에러가 많으면 로그 기록
    if (errors.length > 0) {
      console.error(`❌ Push notification errors:`, errors);
    }

    return { successCount, errors };
  }
}
```

---

## 결론

### 즉시 조치 필요 (1-2주)
1. ✅ Claude API 에러 핸들링 + 재시도
2. ✅ 데이터베이스 에러 핸들링
3. ✅ 푸시 알림 Receipt 확인

### 조만간 조치 (2-4주)
4. ✅ 프론트엔드 네트워크 에러 처리
5. ✅ 배치 작업 모니터링
6. ✅ 이미지 업로드 검증

### 장기 계획 (1-2개월)
7. ✅ 로깅 시스템 (Winston/Sentry)
8. ✅ 모니터링 시스템
9. ✅ 에러 메시지 표준화

---

## 참고 자료

- [Anthropic API 에러 처리](https://docs.anthropic.com/claude/reference/errors)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- [SQLite 에러 코드](https://www.sqlite.org/rescode.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)

---

**작성일**: 2025-11-05
**작성자**: Claude Code + 사용자
**버전**: 1.0
