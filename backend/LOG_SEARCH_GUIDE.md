# 🔍 Railway 로그 검색 가이드

Railway 대시보드에서 로그를 찾을 때 이 검색어를 사용하세요.

---

## 📋 주요 이벤트별 검색어

### 1. AI 코멘트 배치 작업

| 목적 | 검색어 | 설명 |
|------|--------|------|
| **배치 시작** | `[BATCH] AI COMMENT GENERATION STARTED` | 배치 작업이 시작되었는지 확인 |
| **배치 완료** | `[BATCH] AI COMMENT GENERATION COMPLETED` | 배치 작업이 성공적으로 완료되었는지 확인 |
| **진행률** | `[BATCH] Progress:` | 10개마다 찍히는 진행 상황 |
| **에러 발생** | `[BATCH] Failed` | 특정 일기 처리 중 에러 발생 |
| **심각한 에러** | `[BATCH] CRITICAL ERROR` | 배치 작업 전체가 실패한 경우 |

**예시 출력:**
```
🤖 [BATCH] AI COMMENT GENERATION STARTED
⏰ Started at: 2025-11-11T03:00:00.000Z
📊 Total diaries to analyze: 23

📊 [BATCH] Progress: 10/23 (43%)
   Latest comment: "오늘 정말 행복한 하루였구나!..." (nice)
   Success rate: 100%

🎉 [BATCH] AI COMMENT GENERATION COMPLETED
✅ Successful: 23 diaries
❌ Failed: 0 diaries
⏱️  Duration: 45s (avg 2s per diary)
```

---

### 2. 푸시 알림 전송

| 목적 | 검색어 | 설명 |
|------|--------|------|
| **알림 시작** | `[PUSH] NOTIFICATION DELIVERY STARTED` | 푸시 알림 전송 시작 |
| **알림 완료** | `[PUSH] NOTIFICATION SENT` | 몇 명에게 전송되었는지 확인 |
| **대상자 없음** | `[PUSH] No users wrote diary` | 어제 일기 쓴 사용자가 없는 경우 |

**예시 출력:**
```
📬 [PUSH] NOTIFICATION DELIVERY STARTED
👥 Target users: 5
✅ [PUSH] NOTIFICATION SENT to 5 users
```

---

### 3. Push Notification Receipt 확인 (15분마다)

| 목적 | 검색어 | 설명 |
|------|--------|------|
| **Receipt 확인** | `Push notification receipt check` | 15분마다 실행되는 확인 작업 |
| **확인할 것 없음** | `No tickets to check` | 최근 15분간 보낸 알림이 없음 |

---

### 4. 데이터베이스 작업

| 목적 | 검색어 | 설명 |
|------|--------|------|
| **어제 일기 조회** | `[DiaryDatabase] 배치 작업 대상 날짜` | 어떤 날짜의 일기를 처리하는지 확인 |
| **대기 중인 일기** | `AI 코멘트 대기:` | 처리할 일기가 몇 개인지 확인 |
| **알림 대상자** | `[DiaryDatabase] 알림 대상자 조회` | 푸시 알림 받을 사용자 조회 |

**예시 출력:**
```
📅 [DiaryDatabase] 배치 작업 대상 날짜: 2025-11-10
📋 [DiaryDatabase] 2025-11-10 날짜 일기 중 AI 코멘트 대기: 23개
```

---

### 5. 에러 찾기

| 목적 | 검색어 | 설명 |
|------|--------|------|
| **모든 에러** | `❌` | 모든 실패 로그 (이모지 검색) |
| **배치 에러** | `❌ [BATCH]` | 배치 작업 중 발생한 에러만 |
| **심각한 에러** | `💥` | 크리티컬 에러만 검색 |

---

## 🎯 자주 사용하는 검색 시나리오

### "어제 새벽에 코멘트가 달렸나?"
1. 검색: `[BATCH] AI COMMENT GENERATION STARTED`
2. 시간 확인: `⏰ Started at: ...`
3. 결과 확인: `[BATCH] AI COMMENT GENERATION COMPLETED`

### "코멘트가 몇 개나 생성됐나?"
1. 검색: `[BATCH] COMPLETED`
2. 통계 확인:
   - `✅ Successful: X diaries`
   - `❌ Failed: X diaries`
   - `📈 Success rate: X%`

### "푸시 알림이 몇 명에게 갔나?"
1. 검색: `[PUSH] NOTIFICATION SENT`
2. 결과 확인: `to X users`

### "에러가 발생했나?"
1. 검색: `❌ [BATCH]` 또는 `💥`
2. 에러 내용 확인

### "배치 작업이 얼마나 걸렸나?"
1. 검색: `[BATCH] COMPLETED`
2. 시간 확인: `⏱️  Duration: Xs (avg Xs per diary)`

---

## 🛠️ 환경변수 설정 (Railway)

로그 상세도를 조절할 수 있습니다:

```env
# 기본 설정 (간결한 로그)
VERBOSE_LOGS=false
BATCH_LOG_INTERVAL=10

# 디버깅 시 (모든 일기 상세 로그)
VERBOSE_LOGS=true

# 일기가 많을 때 (20개마다 진행률 표시)
BATCH_LOG_INTERVAL=20
```

---

## 📊 로그 출력 예시

### 일반 모드 (VERBOSE_LOGS=false, 일기 23개)

```
================================================================================
🤖 [BATCH] AI COMMENT GENERATION STARTED
================================================================================
⏰ Started at: 2025-11-11T03:00:15.234Z
🌏 Timezone: Asia/Seoul
📊 Total diaries to analyze: 23

📊 [BATCH] Progress: 10/23 (43%)
   Latest comment: "오늘 정말 행복한 하루였구나! 친구들과..." (nice)
   Success rate: 100%

📊 [BATCH] Progress: 20/23 (87%)
   Latest comment: "힘든 하루였지만 잘 버텼어요. 내일은..." (good)
   Success rate: 100%

📊 [BATCH] Progress: 23/23 (100%)
   Latest comment: "평범한 하루. 학교 갔다가 집에 왔어요..." (nice)
   Success rate: 100%

================================================================================
🎉 [BATCH] AI COMMENT GENERATION COMPLETED
================================================================================
✅ Successful: 23 diaries
❌ Failed: 0 diaries
📊 Total processed: 23 diaries
⏱️  Duration: 45s (avg 2s per diary)
📈 Success rate: 100%
⏰ Finished at: 2025-11-11T03:01:00.567Z
📱 Push notifications will be sent at 8:30 AM
================================================================================
```

### 상세 모드 (VERBOSE_LOGS=true, 일기 3개만 예시)

```
================================================================================
🤖 [BATCH] AI COMMENT GENERATION STARTED
================================================================================
⏰ Started at: 2025-11-11T03:00:15.234Z
🌏 Timezone: Asia/Seoul
📊 Total diaries to analyze: 3

📝 [1/3] Analyzing diary abc-123-def...
   Date: 2025-11-10T15:30:00.000Z
   Mood: happy
   Content: 오늘은 정말 좋은 하루였어요. 친구들과 만나서 재미있게...
   ✅ Comment: "정말 행복한 하루를 보냈구나! 친구들과의 시간은 언제나 소중해요."
   🏆 Stamp: nice

📝 [2/3] Analyzing diary ghi-456-jkl...
   Date: 2025-11-10T18:45:00.000Z
   Mood: sad
   Content: 오늘 시험을 못 봐서 속상해요. 더 열심히 공부할걸...
   ✅ Comment: "시험이 잘 안 풀렸구나. 하지만 실수를 통해 더 성장할 거야."
   🏆 Stamp: good

📝 [3/3] Analyzing diary mno-789-pqr...
   Date: 2025-11-10T21:00:00.000Z
   Mood: neutral
   Content: 평범한 하루. 학교 갔다가 집에 왔어요. 숙제하고...
   ✅ Comment: "평범한 하루도 소중해요. 매일매일 차근차근 해나가는 게 중요하지!"
   🏆 Stamp: nice

================================================================================
🎉 [BATCH] AI COMMENT GENERATION COMPLETED
================================================================================
✅ Successful: 3 diaries
❌ Failed: 0 diaries
📊 Total processed: 3 diaries
⏱️  Duration: 8s (avg 3s per diary)
📈 Success rate: 100%
⏰ Finished at: 2025-11-11T03:00:23.890Z
📱 Push notifications will be sent at 8:30 AM
================================================================================
```

---

## 🚨 트러블슈팅

### "배치 작업이 실행 안 됨"
- 검색: `[BATCH] AI COMMENT GENERATION STARTED`
- 없으면: Cron 스케줄 확인 또는 서버 재시작 필요

### "일기는 있는데 처리 안 됨"
- 검색: `배치 작업 대상 날짜`
- 날짜가 맞는지 확인 (어제 날짜만 처리)
- 검색: `AI 코멘트 대기: 0개` → 이미 처리됨 또는 날짜 불일치

### "타임존이 이상함"
- 검색: `Timezone:`
- `Asia/Seoul`이 아니면 Railway 환경변수 확인: `TZ=Asia/Seoul`

---

## 📱 Railway 대시보드 팁

1. **시간 범위 설정**: 로그 검색 시 시간 범위를 좁히면 빠름
2. **북마크**: 자주 사용하는 검색어를 북마크
3. **실시간 로그**: "Live Logs" 모드로 실시간 확인 가능
4. **다운로드**: 로그를 다운로드하여 로컬에서 분석 가능

---

이 가이드를 참고하여 Railway 로그를 효율적으로 검색하세요! 🚀
