# 하트 스탬프 일기 - 전략 로드맵

> 작성일: 2025-01-08
> 목적: MVP 배포부터 프리미엄 서비스까지 단계별 전략

---

## 📋 목차

1. [핵심 전략](#핵심-전략)
2. [Firebase 인증 개요](#firebase-인증-개요)
3. [단계별 로드맵](#단계별-로드맵)
4. [비즈니스 모델](#비즈니스-모델)
5. [기술 구현](#기술-구현)
6. [배포 체크리스트](#배포-체크리스트)

---

## 🎯 핵심 전략

### 핵심 원칙

**"백업은 무료, 프리미엄 기능은 유료"**

#### 이유
- ✅ 일기 앱은 데이터 손실이 치명적
- ✅ 사용자 신뢰 확보가 최우선
- ✅ 장기 사용자 확보 → 유료 전환율 증가
- ✅ 경쟁사도 대부분 백업 무료 제공

#### 차별화 포인트
- AI 기반 감정 분석 (무료)
- 자동 백업 (무료)
- 감성적인 UI/UX
- 프리미엄 고급 분석/테마 (유료)

---

## 🔐 Firebase 인증 개요

### Firebase 익명 인증이란?

사용자가 **가입 화면 없이** 자동으로 고유 ID를 발급받는 방식

```
사용자 앱 실행
    ↓
Firebase 익명 로그인 (자동, 0.5초)
    ↓
고유 ID 발급 (예: "firebase-abc123")
    ↓
이 ID로 서버에 데이터 저장
    ↓
사용자는 그냥 일기만 쓰면 됨!
```

### 장점

| 항목 | 기존 UUID 방식 | Firebase 익명 인증 |
|------|----------------|-------------------|
| **가입 화면** | ❌ 없음 | ❌ 없음 |
| **보안** | 🔴 취약 (위조 가능) | 🟢 안전 (JWT 토큰) |
| **백업** | ⚠️ 로컬만 | ✅ 서버 자동 백업 |
| **멀티 디바이스** | ❌ 불가 | ⚠️ 소셜 로그인 시 가능 |
| **사용자 경험** | 간편 | 간편 |

### 동작 방식

#### 시나리오 1: 익명 사용자
```
📱 iPhone에서 앱 설치
   ↓
자동 로그인 → "user-A" ID 발급
   ↓
일기 10개 작성 → 서버에 "user-A" 계정으로 저장
   ↓
앱 삭제 → 로컬 데이터 삭제
   ↓
앱 재설치 → 새로운 "user-B" ID 발급
   ↓
❌ 이전 일기 복구 불가 (새 계정이므로)
```

#### 시나리오 2: 소셜 로그인 연결
```
📱 iPhone 익명 사용 (user-A)
   ↓
일기 10개 작성
   ↓
설정 → "구글 로그인" 클릭
   ↓
"user-A" ← "google@gmail.com" 연결
   ↓
앱 삭제 → 재설치
   ↓
구글 로그인 → "user-A" 계정 복구
   ↓
✅ 이전 일기 10개 모두 복구!
```

#### 시나리오 3: 멀티 디바이스 (소셜 로그인 후)
```
📱 iPhone: 구글 로그인 → user-A
           일기 15개

📱 iPad: 구글 로그인 → user-A (같은 계정)
         ✅ iPhone 일기 15개 모두 보임
         iPad에서 일기 5개 추가

📱 iPhone: ✅ 자동 동기화 → 20개 모두 보임
```

---

## 📅 단계별 로드맵

### Phase 0: 현재 (테스트 기간)

**기간**: 1-2주
**목적**: 터널로 지인들 테스트

```yaml
환경 설정:
  USE_FIREBASE_AUTH: false  # 기존 방식 유지

제공 기능:
  - 기존 x-user-id 헤더 방식
  - 터널 공유 가능
  - 빠른 피드백 수집

체크리스트:
  - [ ] 터널로 5-10명 테스트
  - [ ] 버그 수집
  - [ ] UX 피드백 수집
  - [ ] 크리티컬 버그 수정
```

---

### Phase 1: MVP 배포 (Week 1-2)

**기간**: 배포 직후 ~ 1개월
**목적**: 조기 사용자 확보 및 검증

```yaml
환경 설정:
  USE_FIREBASE_AUTH: true  # Firebase 인증 활성화

무료 제공 기능:
  ✅ 익명 자동 백업
    - 사용자는 가입 화면 없음
    - 디바이스마다 고유 ID 자동 발급
    - 서버에 자동 백업

  ✅ AI 일일 코멘트
    - Claude Haiku로 감정 분석
    - 일기 작성 후 자동 코멘트

  ✅ 주간 감정 리포트
    - 매주 월요일 자동 생성
    - 주요 감정 키워드
    - 감정 분포 그래프

  ✅ 기본 통계
    - 일기 쓴 날 수
    - 기분 밸런스
    - 주요 키워드

  ✅ 일기당 이미지 1장
    - S3 업로드
    - 썸네일 자동 생성

제한 사항:
  ⚠️ 단일 디바이스만
    - 다른 기기에서 못 봄

  ⚠️ 디바이스 변경 시 복구 불가
    - 앱 삭제 후 재설치 → 새 계정 생성

  ⚠️ 월간 리포트 없음
    - 프리미엄 기능으로 예약

기술 작업:
  백엔드:
    - [ ] .env에서 USE_FIREBASE_AUTH=true 설정
    - [ ] firebase-service-account.json 서버 업로드
    - [ ] 서버 재시작 후 동작 확인

  프론트엔드:
    - [ ] App.tsx에 AuthService.initialize() 추가
    - [ ] apiService.ts 헤더 변경 (x-user-id → Bearer 토큰)
    - [ ] userService.ts Firebase UID 사용
    - [ ] 테스트: 일기 작성/조회/수정/삭제

  배포:
    - [ ] EAS Build (iOS + Android)
    - [ ] 내부 테스트 (TestFlight, Internal Testing)
    - [ ] 베타 테스터 20-50명 모집
    - [ ] 1주일 베타 테스트
    - [ ] 스토어 제출

목표:
  - DAU 100명
  - 리텐션 40% (D7)
  - 평균 일기 작성 주 3회 이상
```

---

### Phase 2: 소셜 로그인 추가 (Month 1-2)

**기간**: MVP 배포 후 1-2개월
**목적**: 사용자 편의성 증대, 멀티 디바이스 지원

```yaml
추가 기능 (여전히 무료):
  ✅ 구글 로그인
    - 익명 계정 → 구글 계정 연결
    - 기존 일기 유지

  ✅ 카카오 로그인
    - 한국 사용자 친화적

  ✅ 멀티 디바이스 동기화
    - 소셜 로그인한 사용자만
    - 실시간 동기화

  ✅ 완전한 백업/복구
    - 디바이스 분실 시 복구 가능
    - 앱 재설치 후 복구 가능

UI/UX 개선:
  설정 화면:
    - "계정 연결하기" 섹션 추가
    - 익명 사용자: "기기 변경 시 복구 불가" 경고
    - 소셜 로그인 버튼 (구글, 카카오)
    - 연결 상태 표시

  온보딩:
    - 첫 실행 시 간단한 가이드
    - "나중에 계정 연결 가능" 안내

기술 작업:
  프론트엔드:
    - [ ] Google Sign-In 구현 (expo-auth-session)
    - [ ] Kakao Sign-In 구현 (@react-native-seoul/kakao-login)
    - [ ] 익명 → 소셜 계정 연결 (linkWithCredential)
    - [ ] 설정 화면 UI 구현
    - [ ] 동기화 상태 표시

  백엔드:
    - [ ] 소셜 로그인 후 사용자 정보 저장
    - [ ] 기존 익명 데이터 마이그레이션 로직
    - [ ] 멀티 디바이스 동기화 최적화

  테스트:
    - [ ] 익명 → 구글 연결 시나리오
    - [ ] 익명 → 카카오 연결 시나리오
    - [ ] 여러 기기에서 동시 접속 테스트
    - [ ] 동기화 충돌 해결 테스트

목표:
  - DAU 500명
  - 소셜 로그인 연결률 30%
  - 리텐션 50% (D7)
```

---

### Phase 3: 프리미엄 기능 출시 (Month 3+)

**기간**: 안정화 후
**목적**: 수익화 시작

```yaml
무료 기능 (계속 유지):
  ✅ 모든 Phase 1, 2 기능
  ✅ 익명/소셜 로그인
  ✅ 서버 백업
  ✅ 멀티 디바이스 (소셜 로그인 시)
  ✅ AI 일일 코멘트
  ✅ 주간 리포트
  ✅ 기본 통계

프리미엄 기능 (유료):
  ⭐ 월간 감정 리포트
    - 한 달 전체 감정 분석
    - 감정 변화 추세
    - 주요 이벤트 하이라이트

  ⭐ 연간 감정 리포트
    - 1년 전체 회고
    - 계절별 감정 분석
    - 성장 인사이트

  ⭐ 프리미엄 테마 & 스탬프
    - 10종 이상의 테마
    - 특별한 스탬프 디자인
    - 계절별 한정 테마

  ⭐ 무제한 이미지
    - 일기당 10장까지
    - 앨범처럼 사용 가능

  ⭐ PDF 내보내기
    - 아름다운 포맷
    - 인쇄용 레이아웃
    - 날짜 범위 선택 가능

  ⭐ 고급 통계
    - 감정 상관관계 분석
    - 날씨와 기분 연관성
    - AI 기반 인사이트

  ⭐ 광고 제거
    - (광고 넣는다면)

  ⭐ 음성 일기 (나중에)
    - Speech-to-Text
    - 음성 메모 저장

가격 정책:
  월간 구독: ₩3,900/월
  연간 구독: ₩39,000/년 (17% 할인)
  평생 구매: ₩99,000 (한번만)

  프로모션:
    - 첫 달 무료 체험
    - 연간 구독 시 첫 달 50% 할인
    - 친구 초대 시 1개월 무료

기술 작업:
  결제:
    - [ ] App Store In-App Purchase 연동
    - [ ] Google Play Billing 연동
    - [ ] 구독 상태 관리
    - [ ] 영수증 검증
    - [ ] 환불 처리

  기능:
    - [ ] 월간/연간 리포트 생성 로직
    - [ ] 프리미엄 테마 에셋 제작
    - [ ] PDF 생성 엔진
    - [ ] 고급 통계 알고리즘

  백엔드:
    - [ ] 구독 상태 DB 테이블
    - [ ] 권한 검증 미들웨어
    - [ ] 프리미엄 API 엔드포인트
    - [ ] 결제 webhook 처리

마케팅:
  - [ ] 프리미엄 기능 소개 페이지
  - [ ] 무료 체험 유도 푸시 알림
  - [ ] 월간 리포트 미리보기 제공
  - [ ] 리퍼럴 프로그램

목표:
  - DAU 1,000명
  - 유료 전환율 15%
  - ARPU ₩585 (1,000명 × 15% × ₩3,900)
  - MRR ₩585,000/월
```

---

## 💰 비즈니스 모델

### 수익 시뮬레이션

#### 시나리오: 보수적 (6개월 후)

```
DAU: 1,000명
유료 전환율: 10%
ARPU: ₩3,900

월 수익 (MRR):
  1,000명 × 10% × ₩3,900 = ₩390,000/월

월 비용:
  - 서버 (AWS): ₩50,000
  - Claude API: ₩100,000
  - S3 스토리지: ₩10,000
  - 기타: ₩40,000
  합계: ₩200,000/월

월 순익: ₩190,000/월
```

#### 시나리오: 낙관적 (1년 후)

```
DAU: 5,000명
유료 전환율: 15%
ARPU: ₩3,900

월 수익 (MRR):
  5,000명 × 15% × ₩3,900 = ₩2,925,000/월

월 비용:
  - 서버: ₩200,000
  - Claude API: ₩400,000
  - S3 스토리지: ₩50,000
  - 마케팅: ₩500,000
  - 기타: ₩100,000
  합계: ₩1,250,000/월

월 순익: ₩1,675,000/월
연 순익: ₩20,100,000/년
```

### 성장 전략

#### 초기 (0-3개월)
- 목표: 제품-시장 적합성(PMF) 찾기
- 전략: 바이럴, 입소문, 지인 추천
- KPI: 리텐션 D7 40% 이상

#### 성장기 (3-12개월)
- 목표: 사용자 베이스 확대
- 전략:
  - 앱스토어 최적화(ASO)
  - 콘텐츠 마케팅 (블로그, 인스타그램)
  - 리퍼럴 프로그램
  - 인플루언서 협업
- KPI: DAU 1,000명, 리텐션 D30 30%

#### 확장기 (1년 이후)
- 목표: 수익화 최적화
- 전략:
  - 유료 광고 (페이스북, 구글)
  - 파트너십 (심리 상담, 웰빙 앱)
  - 프리미엄 기능 확대
  - B2B (기업 웰빙 프로그램)
- KPI: 유료 전환율 15%, LTV/CAC 3.0 이상

---

## 🛠 기술 구현

### 현재 아키텍처

```
┌─────────────┐
│ React Native│  (Expo)
│  Frontend   │
└──────┬──────┘
       │ REST API
       │ Bearer Token (Firebase JWT)
┌──────▼──────┐
│   Express   │
│   Backend   │
├─────────────┤
│  Firebase   │  인증
│   Admin     │
├─────────────┤
│   SQLite    │  일기 데이터
├─────────────┤
│  Claude AI  │  감정 분석
├─────────────┤
│   AWS S3    │  이미지 저장
└─────────────┘
```

### 환경 변수 설정

#### Backend (.env)

```bash
# Firebase 인증 스위치
USE_FIREBASE_AUTH=false  # 테스트 시
USE_FIREBASE_AUTH=true   # 프로덕션 배포 시

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Claude API
CLAUDE_API_KEY=sk-ant-api03-...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-2
S3_BUCKET_NAME=heart-stamp-diary-images

# Server
PORT=3000
ADMIN_SECRET=your-secure-token
ALLOWED_ORIGINS=*
```

### Firebase 인증 전환 방법

#### 테스트 모드 (현재)

```yaml
설정:
  USE_FIREBASE_AUTH: false

동작:
  - 기존 x-user-id 헤더 방식
  - 검증 없음 (빠른 개발)
  - 터널 공유 가능

로그:
  ⚠️ DEV 모드 인증: userId=abc-123-def
```

#### 프로덕션 모드 (배포 시)

```yaml
설정:
  USE_FIREBASE_AUTH: true

동작:
  - Authorization: Bearer <JWT> 헤더
  - Firebase Admin SDK로 토큰 검증
  - 위조 불가능

로그:
  ✅ 인증 성공: userId=firebase-xyz-789
```

### 코드 수정 사항 (배포 시)

#### 1. Backend (.env)

```bash
# 이 한 줄만 변경
USE_FIREBASE_AUTH=true
```

#### 2. Frontend (App.tsx)

```typescript
import { AuthService } from './src/services/authService';
import { useEffect } from 'react';

function App() {
  // 앱 시작 시 Firebase 인증 초기화
  useEffect(() => {
    const initAuth = async () => {
      try {
        await AuthService.initialize();
        console.log('✅ Firebase 인증 초기화 완료');
      } catch (error) {
        console.error('❌ Firebase 인증 초기화 실패:', error);
      }
    };

    initAuth();
  }, []);

  return (
    // ... 기존 코드
  );
}
```

#### 3. Frontend (apiService.ts)

```typescript
// 기존 (x-user-id 헤더)
const userId = await UserService.getUserId();
headers: {
  'x-user-id': userId,
}

// 변경 (Bearer 토큰)
import { AuthService } from './authService';

const token = await AuthService.getIdToken();
headers: {
  'Authorization': `Bearer ${token}`,
}
```

#### 4. Frontend (userService.ts)

```typescript
// 기존 (UUID)
static async getUserId(): Promise<string> {
  let userId = await AsyncStorage.getItem('userId');
  if (!userId) {
    userId = generateUUID();
    await AsyncStorage.setItem('userId', userId);
  }
  return userId;
}

// 변경 (Firebase UID)
static async getUserId(): Promise<string> {
  const user = AuthService.getCurrentUser();
  return user?.uid || '';
}
```

### 마이그레이션 전략 (기존 사용자)

#### 옵션 1: 하드 컷오버 (간단)

```
모든 사용자에게 새로 시작
- 기존 데이터 유지 안 됨
- 개발 간단
- 사용자 불만 가능성
```

#### 옵션 2: UUID → Firebase UID 매핑 (권장)

```sql
-- Backend DB
CREATE TABLE user_migrations (
  old_user_id TEXT PRIMARY KEY,  -- 기존 UUID
  firebase_uid TEXT UNIQUE,      -- 새 Firebase UID
  migrated_at TIMESTAMP
);

-- 첫 로그인 시 자동 마이그레이션
UPDATE diaries
SET userId = :firebaseUid
WHERE userId = :oldUserId;
```

```typescript
// authService.ts
static async migrateFromLegacyAuth(): Promise<void> {
  // 1. 기존 UUID 가져오기
  const legacyUserId = await AsyncStorage.getItem('userId');

  // 2. Firebase 익명 로그인
  const user = await signInAnonymously(auth);

  // 3. 서버에 마이그레이션 요청
  if (legacyUserId) {
    await apiService.migrateUser(legacyUserId, user.uid);
  }
}
```

---

## ✅ 배포 체크리스트

### Phase 1: MVP 배포

#### 백엔드 준비

- [ ] **환경 변수 설정**
  - [ ] USE_FIREBASE_AUTH=true 변경
  - [ ] FIREBASE_SERVICE_ACCOUNT_PATH 확인
  - [ ] firebase-service-account.json 서버 업로드
  - [ ] Claude API 키 확인
  - [ ] AWS S3 자격증명 확인

- [ ] **서버 설정**
  - [ ] 프로덕션 서버 준비 (EC2, Railway, Render 등)
  - [ ] HTTPS 설정
  - [ ] 도메인 연결 (api.heartstamp.com 등)
  - [ ] CORS 설정 (ALLOWED_ORIGINS)
  - [ ] 헬스체크 엔드포인트 확인

- [ ] **데이터베이스**
  - [ ] SQLite DB 백업 스크립트 확인
  - [ ] 자동 백업 cron job 확인 (매일 4시)
  - [ ] 마이그레이션 테이블 생성

- [ ] **모니터링**
  - [ ] 에러 로깅 (Console 또는 파일)
  - [ ] Sentry 통합 (선택사항)
  - [ ] 서버 상태 모니터링

#### 프론트엔드 준비

- [ ] **코드 수정**
  - [ ] App.tsx에 AuthService.initialize() 추가
  - [ ] apiService.ts 헤더 변경 (Bearer 토큰)
  - [ ] userService.ts Firebase UID 사용
  - [ ] API 베이스 URL 프로덕션으로 변경

- [ ] **설정 파일**
  - [ ] app.json 버전 업데이트
  - [ ] expo-updates 채널 설정
  - [ ] 앱 아이콘 최종 확인
  - [ ] 스플래시 스크린 확인

- [ ] **빌드 준비**
  - [ ] EAS 계정 생성
  - [ ] eas.json 설정
  - [ ] Apple Developer 계정 (iOS)
  - [ ] Google Play Console 계정 (Android)

#### 테스트

- [ ] **기능 테스트**
  - [ ] 회원가입/로그인 플로우 (익명)
  - [ ] 일기 작성/수정/삭제
  - [ ] AI 코멘트 생성
  - [ ] 이미지 업로드
  - [ ] 주간 리포트 생성
  - [ ] 푸시 알림

- [ ] **크로스 플랫폼 테스트**
  - [ ] iOS (최소 iOS 13)
  - [ ] Android (최소 Android 6.0)
  - [ ] 다양한 화면 크기

- [ ] **네트워크 테스트**
  - [ ] 느린 네트워크 (3G)
  - [ ] 오프라인 → 온라인 전환
  - [ ] 서버 응답 지연 시나리오

#### 배포

- [ ] **EAS Build**
  ```bash
  # iOS
  eas build --platform ios --profile production

  # Android
  eas build --platform android --profile production
  ```

- [ ] **베타 테스트**
  - [ ] TestFlight 업로드 (iOS)
  - [ ] Internal Testing 업로드 (Android)
  - [ ] 베타 테스터 20-50명 초대
  - [ ] 1주일 베타 테스트
  - [ ] 크리티컬 버그 수정

- [ ] **스토어 제출**
  - [ ] App Store 메타데이터 작성
    - [ ] 앱 설명
    - [ ] 스크린샷 (5-6장)
    - [ ] 미리보기 비디오 (선택)
    - [ ] 카테고리: Lifestyle
    - [ ] 연령 등급
  - [ ] Google Play 메타데이터 작성
    - [ ] 앱 설명 (짧은 설명, 전체 설명)
    - [ ] 스크린샷
    - [ ] 특집 이미지
    - [ ] 카테고리: Lifestyle
    - [ ] 콘텐츠 등급
  - [ ] 개인정보처리방침 URL
  - [ ] 서비스 이용약관 URL

#### 출시 후

- [ ] **모니터링**
  - [ ] 크래시 리포트 확인
  - [ ] 사용자 피드백 수집
  - [ ] 서버 부하 모니터링
  - [ ] API 응답 시간 확인

- [ ] **마케팅**
  - [ ] SNS 공지 (인스타그램, 블로그)
  - [ ] 지인 공유
  - [ ] 커뮤니티 홍보 (카페, 커뮤니티)

- [ ] **개선**
  - [ ] 사용자 리뷰 대응
  - [ ] 버그 수정 업데이트
  - [ ] UX 개선 사항 수집

---

### Phase 2: 소셜 로그인 추가

#### 준비

- [ ] **Firebase Console 설정**
  - [ ] Google 로그인 활성화
  - [ ] OAuth 클라이언트 ID 생성
  - [ ] 카카오 개발자 앱 생성
  - [ ] Redirect URI 설정

- [ ] **코드 구현**
  - [ ] Google Sign-In 구현
  - [ ] Kakao Sign-In 구현
  - [ ] 익명 → 소셜 연결 로직
  - [ ] 설정 화면 UI

- [ ] **테스트**
  - [ ] 익명 → 구글 연결 시나리오
  - [ ] 익명 → 카카오 연결 시나리오
  - [ ] 멀티 디바이스 동기화
  - [ ] 데이터 손실 없음 확인

#### 배포

- [ ] OTA 업데이트 (expo-updates)
- [ ] 또는 앱 버전 업데이트

---

### Phase 3: 프리미엄 출시

#### 준비

- [ ] **결제 시스템**
  - [ ] App Store In-App Purchase 설정
  - [ ] Google Play Billing 설정
  - [ ] 구독 상품 생성 (월간, 연간)
  - [ ] 영수증 검증 서버 구현

- [ ] **프리미엄 기능 개발**
  - [ ] 월간/연간 리포트
  - [ ] 프리미엄 테마
  - [ ] PDF 내보내기
  - [ ] 고급 통계

- [ ] **권한 시스템**
  - [ ] DB에 구독 상태 테이블
  - [ ] 권한 검증 미들웨어
  - [ ] 프론트엔드 기능 게이팅

#### 마케팅

- [ ] 프리미엄 소개 페이지
- [ ] 무료 체험 캠페인
- [ ] 이메일 마케팅 (가능 시)
- [ ] 리퍼럴 프로그램

---

## 📊 성공 지표 (KPI)

### Phase 1 (MVP)

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| DAU | 100명 | Analytics |
| 리텐션 D7 | 40% | Cohort 분석 |
| 주간 일기 작성 | 평균 3회 | DB 쿼리 |
| 크래시율 | <1% | Sentry/Console |
| 앱 평점 | 4.5+ | 스토어 리뷰 |

### Phase 2 (소셜 로그인)

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| DAU | 500명 | Analytics |
| 소셜 로그인 연결률 | 30% | DB 쿼리 |
| 리텐션 D7 | 50% | Cohort 분석 |
| 리텐션 D30 | 30% | Cohort 분석 |

### Phase 3 (프리미엄)

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| DAU | 1,000명 | Analytics |
| 유료 전환율 | 15% | 결제 데이터 |
| MRR | ₩585,000 | 결제 시스템 |
| LTV/CAC | 3.0+ | 재무 분석 |
| Churn Rate | <5%/월 | 구독 취소율 |

---

## 🎯 결론

### 핵심 원칙 재확인

1. **사용자 신뢰 우선**
   - 백업은 무료로 제공
   - 데이터 손실 절대 방지

2. **단계적 성장**
   - MVP → 소셜 로그인 → 프리미엄
   - 각 단계마다 검증 후 진행

3. **가치 제공 후 수익화**
   - 먼저 좋은 제품 만들기
   - 사용자가 가치를 느낀 후 유료 전환

### 다음 단계

1. **지금 (Phase 0)**
   - 터널로 테스트 계속
   - 피드백 수집

2. **1-2주 후 (Phase 1)**
   - "Firebase 인증 켜주세요" 요청
   - MVP 배포

3. **1-2개월 후 (Phase 2)**
   - 소셜 로그인 추가

4. **3개월 후 (Phase 3)**
   - 프리미엄 기능 출시

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-01-08
**작성자**: Claude + 개발자님

이 문서는 프로젝트 진행에 따라 계속 업데이트됩니다.
