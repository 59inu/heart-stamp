# AI 통합 (AI Integration)

Heart Stamp Diary의 Claude AI 통합 및 자동화 작업을 설명합니다.

## 🤖 AI 서비스 개요

### Claude API

**모델**: Claude 3.5 Haiku
- **속도**: 초고속 응답 (~1-2초)
- **비용**: ~$0.80/1M input tokens, ~$4/1M output tokens
- **용도**: 감정 분석, 스탬프 추천, 선생님 코멘트

### 서비스 구조

```
ClaudeService
  ├── Circuit Breaker (장애 대응)
  ├── Retry Logic (재시도)
  └── Rate Limiting (속도 제한)
```

## 📐 AI 분석 아키텍처

```
매일 새벽 3시 (Cron Job)
    ↓
1. 전날 작성된 일기 조회 (AI 코멘트 없는 것만)
    ↓
2. 각 일기에 대해 Claude API 호출
    ↓
3. 감정 분석 + 스탬프 추천 + 선생님 코멘트 생성
    ↓
4. 데이터베이스 업데이트 (암호화)
    ↓
5. 매일 아침 8시 30분: 푸시 알림 전송
```

## 🔧 Claude 서비스 구현

### 초기화

```typescript
// backend/src/services/claudeService.ts

export class ClaudeService {
  private client: Anthropic;
  private circuitBreaker: CircuitBreaker;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey: apiKey || 'mock-api-key',
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,     // 5회 연속 실패 시 차단
      resetTimeout: 60000,     // 60초 후 재시도
    });

    console.log('✅ ClaudeService initialized with Circuit Breaker');
  }
}
```

### Circuit Breaker (장애 대응)

```
상태 머신:

CLOSED (정상)
  ↓ 5회 연속 실패
OPEN (차단)
  ↓ 60초 대기
HALF_OPEN (테스트)
  ↓ 1회 성공
CLOSED (정상 복귀)
```

**장점**:
- ✅ Claude API 장애 시 즉시 차단
- ✅ 무의미한 재시도 방지
- ✅ 자동 복구

### 일기 분석 메서드

```typescript
async analyzeDiaryEntry(
  content: string,
  moodTag?: string
): Promise<{ stampType: string; aiComment: string }> {

  // Circuit Breaker 확인
  if (!this.circuitBreaker.canAttempt()) {
    throw new Error('Circuit breaker is OPEN - Claude API unavailable');
  }

  try {
    const response = await this.client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: this.buildPrompt(content, moodTag)
      }]
    });

    // 성공 시 Circuit Breaker 상태 갱신
    this.circuitBreaker.recordSuccess();

    return this.parseResponse(response);
  } catch (error) {
    // 실패 시 Circuit Breaker 상태 갱신
    this.circuitBreaker.recordFailure();
    throw error;
  }
}
```

## 📝 프롬프트 설계

### 시스템 프롬프트

```typescript
buildPrompt(content: string, moodTag?: string): string {
  return `
당신은 초등학생의 감정 일기를 읽고 따뜻한 코멘트를 남기는 초등학교 선생님입니다.

일기 내용:
${content}

${moodTag ? `감정 태그: ${moodTag}` : ''}

다음 2가지를 분석해주세요:

1. 스탬프 추천 (아래 중 하나 선택):
   - stamp-happy: 기쁨, 행복, 즐거움
   - stamp-proud: 자랑스러움, 성취감
   - stamp-calm: 평온함, 안정감
   - stamp-excited: 설렘, 흥분
   - stamp-sad: 슬픔, 우울함
   - stamp-angry: 화남, 짜증
   - stamp-anxious: 불안함, 걱정
   - stamp-tired: 피곤함, 지침
   - stamp-confused: 혼란스러움, 고민
   - stamp-grateful: 감사함, 고마움

2. 선생님 코멘트 (2-3문장, 초등학생이 이해하기 쉽게):
   - 긍정적이고 따뜻한 톤
   - 구체적인 감정이나 경험 언급
   - 격려와 공감

응답 형식:
{
  "stampType": "stamp-happy",
  "aiComment": "오늘 하루도 긍정적인 에너지로 가득했네요! 😊"
}
`;
}
```

### 응답 파싱

```typescript
parseResponse(response: any): { stampType: string; aiComment: string } {
  const text = response.content[0].text;

  // JSON 추출 (마크다운 코드 블록 제거)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    stampType: parsed.stampType || 'stamp-happy',
    aiComment: parsed.aiComment || '오늘도 수고했어요! 😊'
  };
}
```

## ⏰ 배치 작업 (AI Analysis Job)

### 스케줄

```typescript
// backend/src/jobs/aiAnalysisJob.ts

export class AIAnalysisJob {
  constructor(private claudeService: ClaudeService) {
    // 매일 새벽 3시 실행
    this.scheduleBatchAnalysis();

    // 매일 아침 8시 30분 푸시 알림
    this.scheduleMorningPush();
  }

  private scheduleBatchAnalysis() {
    cron.schedule('0 3 * * *', async () => {
      console.log('🤖 [AI Analysis Job] Starting batch analysis...');
      await this.runBatchAnalysis();
    });
  }

  private scheduleMorningPush() {
    cron.schedule('30 8 * * *', async () => {
      console.log('📱 [Morning Push] Sending notifications...');
      await this.sendMorningNotifications();
    });
  }
}
```

### 배치 분석 실행

```typescript
async runBatchAnalysis(): Promise<void> {
  try {
    // 1. 전날 작성된 일기 중 AI 코멘트 없는 것 조회
    const pendingDiaries = DiaryDatabase.getPending();

    console.log(`📋 Found ${pendingDiaries.length} diaries to analyze`);

    if (pendingDiaries.length === 0) {
      console.log('✅ No pending diaries to analyze');
      return;
    }

    // 2. 각 일기 분석
    let successCount = 0;
    let failureCount = 0;

    for (const diary of pendingDiaries) {
      try {
        // Claude API 호출
        const { stampType, aiComment } = await this.claudeService.analyzeDiaryEntry(
          diary.content,
          diary.moodTag
        );

        // 데이터베이스 업데이트
        await DiaryDatabase.update(diary._id, {
          stampType,
          aiComment,
        });

        successCount++;
        console.log(`✅ [${diary._id}] AI comment added`);

        // Rate Limiting (초당 5개 제한)
        await sleep(200);
      } catch (error) {
        failureCount++;
        console.error(`❌ [${diary._id}] Analysis failed:`, error);
      }
    }

    console.log(`🎉 Batch analysis completed: ${successCount} success, ${failureCount} failure`);
  } catch (error) {
    console.error('❌ Batch analysis failed:', error);
  }
}
```

### 아침 푸시 알림

```typescript
async sendMorningNotifications(): Promise<void> {
  try {
    // 1. 전날 AI 코멘트 받은 사용자 조회
    const userIds = DiaryDatabase.getUsersWithAICommentYesterday();

    console.log(`👥 Found ${userIds.length} users to notify`);

    if (userIds.length === 0) {
      console.log('✅ No users to notify');
      return;
    }

    // 2. 각 사용자에게 푸시 알림 전송
    let successCount = 0;
    let failureCount = 0;

    for (const userId of userIds) {
      try {
        const pushToken = PushTokenDatabase.get(userId);

        if (!pushToken) {
          console.log(`⚠️ [${userId}] No push token registered`);
          continue;
        }

        await PushNotificationService.sendNotification(
          pushToken,
          '선생님 코멘트 도착 ✨',
          '밤 사이 선생님이 일기를 읽고 코멘트를 남겼어요',
          { type: 'ai_comment_complete' }
        );

        successCount++;
        console.log(`✅ [${userId}] Notification sent`);
      } catch (error) {
        failureCount++;
        console.error(`❌ [${userId}] Notification failed:`, error);
      }
    }

    console.log(`🎉 Morning push completed: ${successCount} sent, ${failureCount} failed`);
  } catch (error) {
    console.error('❌ Morning push failed:', error);
  }
}
```

## 📊 비용 최적화

### 토큰 사용량 예측

**평균 일기 길이**: 200자 (한글)
- Input tokens: ~300 (일기 + 프롬프트)
- Output tokens: ~150 (스탬프 + 코멘트)

**일일 비용 예측** (100명 사용자 기준):

```
Input:  100 * 300 = 30,000 tokens
        30,000 / 1,000,000 * $0.80 = $0.024

Output: 100 * 150 = 15,000 tokens
        15,000 / 1,000,000 * $4.00 = $0.060

Total: $0.084/day ≈ $2.52/month
```

### 비용 절감 전략

1. **배치 처리**: 실시간이 아닌 배치로 처리 (새벽 3시)
2. **짧은 프롬프트**: 불필요한 예시 제거
3. **max_tokens 제한**: 300토큰으로 제한
4. **캐싱**: 동일한 일기는 재분석하지 않음

## 🔄 재시도 로직

### 지수 백오프 (Exponential Backoff)

```typescript
async retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error; // 마지막 시도 실패 시 에러 발생
      }

      // 지수 백오프: 1초, 2초, 4초
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}
```

### 사용 예시

```typescript
const { stampType, aiComment } = await this.retryWithBackoff(
  () => this.claudeService.analyzeDiaryEntry(content, moodTag),
  3 // 최대 3회 재시도
);
```

## 🚨 에러 처리

### Claude API 에러

```typescript
try {
  const result = await claudeService.analyzeDiaryEntry(content);
} catch (error: any) {
  if (error.status === 429) {
    // Rate Limit 초과
    console.error('⚠️ Claude API rate limit exceeded');
    await sleep(60000); // 1분 대기
  } else if (error.status === 500) {
    // Claude API 서버 에러
    console.error('❌ Claude API server error');
    // Circuit Breaker가 자동으로 차단
  } else {
    // 기타 에러
    console.error('❌ Unknown error:', error);
  }
}
```

### Fallback 전략

```typescript
try {
  const result = await claudeService.analyzeDiaryEntry(content);
  return result;
} catch (error) {
  console.error('❌ AI analysis failed, using fallback');

  // Fallback: 기본 스탬프와 코멘트
  return {
    stampType: 'stamp-happy',
    aiComment: '오늘도 일기를 작성해줘서 고마워요! 😊'
  };
}
```

## 📈 성능 모니터링

### 분석 시간 측정

```typescript
const startTime = Date.now();

const result = await claudeService.analyzeDiaryEntry(content);

const duration = Date.now() - startTime;
console.log(`⏱️ AI analysis took ${duration}ms`);

// Sentry에 성능 메트릭 전송
Sentry.captureMessage('AI analysis completed', {
  level: 'info',
  extra: { duration, diaryLength: content.length }
});
```

### 배치 작업 통계

```typescript
console.log(`
🎉 Batch Analysis Report
  - Total diaries: ${pendingDiaries.length}
  - Success: ${successCount}
  - Failure: ${failureCount}
  - Success rate: ${(successCount / pendingDiaries.length * 100).toFixed(2)}%
  - Total time: ${totalTime}ms
  - Average time per diary: ${(totalTime / pendingDiaries.length).toFixed(2)}ms
`);
```

## 🔍 테스트 및 디버깅

### 수동 트리거 (관리자 API)

```bash
# 배치 분석 수동 실행
POST /api/jobs/trigger-analysis
Header: x-admin-token: <ADMIN_SECRET>

# 응답
{
  "success": true,
  "message": "Batch analysis triggered successfully"
}
```

### MOCK 모드

```typescript
const USE_MOCK = !process.env.CLAUDE_API_KEY;

if (USE_MOCK) {
  console.log('⚠️ Using MOCK mode for Claude API');
  return {
    stampType: 'stamp-happy',
    aiComment: '[MOCK] 오늘도 수고했어요!'
  };
}
```

## 🎯 향후 개선 계획

### Phase 1 (현재)
- ✅ Claude 3.5 Haiku 사용
- ✅ 배치 분석 (새벽 3시)
- ✅ Circuit Breaker
- ✅ 재시도 로직

### Phase 2 (개선)
- [ ] 실시간 분석 (일기 작성 직후)
- [ ] 더 정교한 감정 분석 (다중 감정)
- [ ] 개인화된 코멘트 (사용자 히스토리 기반)
- [ ] 다국어 지원 (영어, 일본어)

### Phase 3 (고급 기능)
- [ ] 감정 추이 분석 (주간/월간)
- [ ] 맞춤형 질문 생성
- [ ] 대화형 AI (멀티턴)
- [ ] Fine-tuning (사용자 맞춤형 모델)

## 📚 참고 자료

- [Claude API 문서](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Claude 3.5 Haiku 가격](https://www.anthropic.com/pricing)
- [Circuit Breaker 패턴](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
