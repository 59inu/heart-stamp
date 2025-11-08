# Firebase Analytics (GA4) 설정 가이드

## 📊 리텐션 추적 시스템 구현 완료!

하트스탬프 앱에 **Google Analytics 4 (Firebase Analytics)** 기반의 종합 리텐션 추적 시스템이 구현되었습니다.

### ✅ 구현된 핵심 기능

#### 1. **리텐션 추적 코어**
- `AnalyticsService`: Firebase Analytics 이벤트 로깅
- `RetentionService`: 연속 작성 일수, 이탈 위험도 계산
- 사용자 ID 자동 연결 (기존 UserService 활용)

#### 2. **추적되는 핵심 이벤트**
| 이벤트 | 설명 | 리텐션 중요도 |
|--------|------|-------------|
| `first_open` | 앱 첫 실행 (코호트 분석 시작점) | ⭐⭐⭐ |
| `onboarding_complete` | 온보딩 완료 | ⭐⭐⭐ |
| `diary_save` | 일기 저장 (가장 중요!) | ⭐⭐⭐ |
| `ai_comment_viewed` | AI 코멘트 조회 (핵심 가치 전달) | ⭐⭐⭐ |
| `ai_comment_notification_received` | AI 코멘트 알림 수신 | ⭐⭐ |
| `notification_toggle` | 알림 설정 변경 (이탈 신호) | ⭐⭐ |

#### 3. **사용자 속성 (User Properties)**
- `user_cohort`: 첫 사용일 (YYYY-MM-DD) → 코호트 분석용
- `total_diaries_written`: 총 작성 일기 수
- `current_write_streak`: 현재 연속 작성 일수 🔥
- `longest_write_streak`: 최장 연속 작성 일수
- `days_since_last_write`: 마지막 작성 후 경과 일수
- `churn_risk_score`: 이탈 위험도 (low/medium/high)
- `last_active_date`: 마지막 활동일
- `teacher_comment_notification_enabled`: 선생님 코멘트 알림 설정
- `daily_reminder_enabled`: 일기 작성 알림 설정

---

## 🚀 Firebase 설정 단계 (필수!)

### 1️⃣ Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **프로젝트 추가** 클릭
3. 프로젝트 이름: `heart-stamp` (또는 원하는 이름)
4. Google Analytics 사용 설정: **예** 선택 ✅
5. Analytics 계정 선택 (신규 생성 또는 기존 계정)

### 2️⃣ iOS 앱 추가

1. Firebase 프로젝트 → **iOS 앱 추가**
2. **번들 ID**: `com.heartstamp.app` (app.json과 동일해야 함!)
3. 앱 닉네임: `Heart Stamp iOS`
4. App Store ID: (나중에 입력 가능)
5. **GoogleService-Info.plist** 다운로드

### 3️⃣ Android 앱 추가

1. Firebase 프로젝트 → **Android 앱 추가**
2. **패키지 이름**: `com.heartstamp.app` (app.json과 동일해야 함!)
3. 앱 닉네임: `Heart Stamp Android`
4. 디버그 서명 인증서 SHA-1: (나중에 추가 가능)
5. **google-services.json** 다운로드

### 4️⃣ 설정 파일 배치

#### iOS
```bash
# Xcode 프로젝트에 GoogleService-Info.plist 추가
# 위치: ios/heartstamp/GoogleService-Info.plist
# (EAS Build 사용 시 자동으로 처리됨)
```

#### Android
```bash
# google-services.json을 android/app 폴더에 배치
cp google-services.json android/app/
```

### 5️⃣ iOS Pod 설치

```bash
cd ios
pod install
cd ..
```

### 6️⃣ Android build.gradle 수정

`android/build.gradle` 파일에 다음 추가:

```gradle
buildscript {
    dependencies {
        // ... 기존 dependencies
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

`android/app/build.gradle` 파일 **하단**에 다음 추가:

```gradle
apply plugin: 'com.google.gms.google-services'
```

### 7️⃣ GA4 속성 연결

1. Firebase Console → **Analytics** → **이벤트** 메뉴
2. Google Analytics 4 속성이 자동으로 연결되었는지 확인
3. (옵션) Google Analytics Console에서도 확인 가능

---

## 🧪 테스트 방법

### 개발/프로덕션 모드 차이 ⚙️

**중요**: 개발 모드에서는 Firebase로 데이터를 전송하지 않습니다!

| 모드 | Firebase 전송 | 콘솔 로그 | 용도 |
|------|-------------|----------|------|
| **개발 모드** (`__DEV__ = true`) | ❌ 전송 안 함 | ✅ `[MOCK]` 로그 출력 | 로컬 디버깅 |
| **프로덕션 모드** (`__DEV__ = false`) | ✅ Firebase로 전송 | ❌ 로그 없음 | 실제 사용자 분석 |

**설정 변경**: `src/config/analytics.ts`
```typescript
export const ANALYTICS_CONFIG = {
  enableTracking: !__DEV__,        // 프로덕션에서만 전송
  enableLogging: true,              // 로그 출력 활성화
  forceEnableInDev: false,          // 개발 중 Firebase 테스트 필요 시 true
};
```

⚠️ **주의**: `forceEnableInDev: true`로 설정하면 개발 중에도 Firebase로 전송되어 실제 분석 데이터가 오염됩니다. 테스트 후 반드시 `false`로 되돌리세요!

### 개발 모드에서 이벤트 확인

1. 앱 실행:
   ```bash
   npx expo start
   ```

2. 터미널 로그에서 확인 (MOCK 모드):
   ```
   📊 [MOCK] Analytics Event: first_open { platform: 'ios', timestamp: '...' }
   📊 [MOCK] Analytics Event: diary_save { is_new: true, character_count: 123, ... }
   📊 [MOCK] User Property: current_write_streak = 3
   ```

3. **Firebase Console 실시간 테스트** (필요 시)
   - `src/config/analytics.ts`에서 `forceEnableInDev: true` 설정
   - **Firebase Console → Analytics → DebugView** 에서 실시간 확인
   - iOS: Settings → Developer Mode ON
   - Android: `adb shell setprop debug.firebase.analytics.app com.heartstamp.app`
   - ⚠️ 테스트 완료 후 `forceEnableInDev: false`로 되돌리기!

### 리텐션 지표 확인

```typescript
// SettingsScreen에서 디버깅용 리포트 확인
import { RetentionService } from '../services/retentionService';

const report = await RetentionService.getRetentionReport();
console.log('📊 Retention Report:', report);
```

출력 예시:
```json
{
  "firstOpenDate": "2025-01-15",
  "daysActive": 7,
  "totalDiaries": 12,
  "currentStreak": 3,
  "longestStreak": 5,
  "daysSinceLastWrite": 0,
  "churnRisk": "low"
}
```

---

## 📈 GA4에서 확인할 수 있는 리포트

### 1. 리텐션 코호트 분석

**GA4 Console → 보고서 → 리텐션**
- Day 1, 7, 14, 30 리텐션 자동 계산
- 코호트별 리텐션 비교 (first_open_date 기준)

예상 결과:
```
코호트: 2025-01-15 (10명)
- Day 1: 45% (첫 일기 작성)
- Day 7: 28% (주간 리포트 확인)
- Day 30: 15% (월간 리포트 확인)
```

### 2. 연속 작성 일수 분포

**GA4 Console → 탐색 → 잠재고객 분석**
- `current_write_streak` 속성으로 세그먼트 생성
- 3일 연속 작성 유저 vs. 그렇지 않은 유저 비교

예상 발견:
- 3일 연속 작성 유저의 30일 리텐션: 80%
- 3일 미만 유저의 30일 리텐션: 15%

### 3. AI 코멘트 효과 측정

**이벤트 퍼널**:
```
diary_save → ai_comment_notification_received → ai_comment_viewed
```

**측정 지표**:
- AI 코멘트 열람률: `ai_comment_viewed` / `ai_comment_notification_received`
- 평균 열람 시간: `time_since_notification_minutes`

### 4. 이탈 위험 유저 탐지

**세그먼트 조건**:
- `days_since_last_write >= 3`
- `notification_toggle (enabled: false)`
- `churn_risk_score = 'high'`

**활용**:
- 푸시 알림으로 재참여 유도
- 인센티브 제공 (예: 프리미엄 1주일 무료)

---

## 💡 리텐션 개선 인사이트 예시

### 발견 1: 3일 연속 작성이 습관 형성의 전환점
```
데이터: 3일 연속 작성 유저의 리텐션이 3배 높음
액션:
- "3일 연속 작성 배지" 추가
- 연속 작성 카운터를 더 눈에 띄게 표시
- Day 2 유저에게 푸시: "내일만 더 쓰면 습관이 형성돼요!"
```

### 발견 2: AI 코멘트를 빨리 확인할수록 재방문률 높음
```
데이터: 알림 후 1시간 이내 확인한 유저의 다음날 작성률 60%
액션:
- AI 코멘트 생성 시간 최적화 (오전 7-8시)
- 알림 문구 개선: "선생님이 코멘트를 달았어요! 💚"
```

### 발견 3: "keep_going" 스탬프만 받으면 이탈률 2배
```
데이터: keep_going 스탬프만 5회 연속 받은 유저의 이탈률 2배
액션:
- AI 프롬프트 개선: 긍정적 피드백 비율 조정
- 스탬프 타입 분포 모니터링 (excellent 30%, good 40%, nice 20%, keep_going 10%)
```

---

## 🔒 개인정보 보호

### 이미 준비된 것 ✅
- 온보딩에서 개인정보 동의 획득
- AI 데이터 공유 동의 명시
- UUID만 사용 (이름, 이메일 등 PII 없음)

### Firebase 설정 확인
1. Firebase Console → **프로젝트 설정** → **개인정보 보호**
2. **IP 익명화**: 켜기 ✅
3. **광고 기능**: 끄기 ✅
4. **데이터 수집 기간**: 14개월 (기본값)

### 개인정보 처리방침 업데이트 (필요 시)
기존 PrivacyDetailScreen에 다음 내용 추가:
```
3. 분석 데이터 수집
- Google Firebase Analytics를 사용하여 앱 사용 패턴을 분석합니다
- 수집 데이터: 앱 사용 이벤트, 기기 정보 (기종, OS 버전)
- 개인 식별 정보는 수집하지 않습니다 (UUID만 사용)
- 목적: 서비스 개선, 사용자 경험 향상
```

---

## 📊 다음 단계 (선택 사항)

### Phase 2: 고급 이벤트 추가

이미 준비된 함수들:
```typescript
// 리포트 관련
await AnalyticsService.logReportGenerate('week', 5, true);

// 스탬프 컬렉션
await AnalyticsService.logStampCollectionOpen(12, 'mood_stats_tap');

// 설문 참여 (프리미엄 전환 신호!)
await AnalyticsService.logSurveyParticipate(5);

// 일기 삭제 (부정적 신호)
await AnalyticsService.logDiaryDelete(diary, true);
```

**추가 위치 제안**:
- `ReportScreen` → `logReportGenerate`
- `StampCollectionScreen` → `logStampCollectionOpen`
- `SurveyModal` → `logSurveyParticipate`
- `DiaryDetailScreen` → `logDiaryDelete`

### Phase 3: 이탈 예측 & 재참여

```typescript
// 이탈 위험 유저 자동 감지
if (churnRisk === 'high') {
  // 푸시 알림 전송
  // 인센티브 제공
  // 이메일 발송 등
}
```

---

## ❓ FAQ

### Q1. 이벤트가 Firebase Console에 안 보여요
**A**: DebugView 활성화 확인
- iOS: Settings → Developer Mode ON
- Android: `adb shell setprop debug.firebase.analytics.app com.heartstamp.app`

### Q2. Production에서도 로그가 보이나요?
**A**: 아니요! 개발/프로덕션 모드가 완전히 분리되어 있습니다.
- **개발 모드** (`__DEV__ = true`):
  - 콘솔에 `[MOCK]` 로그 출력
  - Firebase 전송 안 함 (데이터 오염 방지)
- **프로덕션 모드** (`__DEV__ = false`):
  - 로그 출력 안 함
  - Firebase로 실제 전송

**설정 변경**: `src/config/analytics.ts`의 `ANALYTICS_CONFIG` 수정

### Q3. 비용이 얼마나 나오나요?
**A**: Firebase Analytics (GA4)는 **완전 무료**입니다!
- 이벤트 제한 없음
- 사용자 수 제한 없음
- 데이터 보관 기간: 14개월

### Q4. 리텐션 데이터는 언제부터 볼 수 있나요?
**A**:
- 실시간 이벤트: 즉시 (DebugView)
- 리포트: 24-48시간 후
- 코호트 분석: 최소 7일 데이터 필요

### Q5. Sentry와 함께 사용할 수 있나요?
**A**: 네! 내일 Sentry 통합 예정
- Analytics: 사용자 행동 분석
- Sentry: 에러 추적 및 모니터링
- 두 가지 모두 logger.ts와 통합 가능

---

## 🎯 성공 지표

### 첫 달 목표
- [ ] Day 1 리텐션: 40% 이상
- [ ] Day 7 리텐션: 25% 이상
- [ ] 3일 연속 작성 달성률: 30% 이상
- [ ] AI 코멘트 열람률: 60% 이상

### 측정 대시보드
**GA4 Console → 탐색 → 새 탐색 만들기**

1. **리텐션 대시보드**
   - 코호트 분석 (Day 1, 7, 14, 30)
   - 연속 작성 일수 분포
   - 이탈 위험 세그먼트

2. **참여도 대시보드**
   - 일기 작성 빈도
   - AI 코멘트 열람률
   - 리포트 생성률

3. **전환 퍼널**
   - 온보딩 → 첫 일기 → AI 코멘트 → 3일 연속
   - 설문 참여율 (프리미엄 전환 신호)

---

## 🚀 준비 완료!

리텐션 추적 시스템이 완벽하게 준비되었습니다!

**이제 해야 할 일**:
1. ✅ Firebase 프로젝트 생성
2. ✅ iOS/Android 앱 등록
3. ✅ 설정 파일 다운로드 및 배치
4. ✅ 빌드 및 테스트
5. ✅ Firebase Console에서 이벤트 확인

**다음 작업**:
- 내일: Sentry 통합 (에러 추적)
- 출시 후: GA4 리포트 분석 및 개선

---

**문의사항이 있으면 언제든지 말씀해주세요!** 🙌
