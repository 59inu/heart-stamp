# 인증 전략 (Authentication Strategy)

Heart Stamp Diary의 사용자 인증 및 세션 관리 전략을 설명합니다.

## 🔐 인증 아키텍처

```
┌─────────────────┐
│   iOS App       │
│  (React Native) │
└────────┬────────┘
         │
         │ 개발 모드: x-user-id 헤더
         │ 프로덕션: Authorization: Bearer <token>
         │
         ↓
┌─────────────────────────┐
│  인증 미들웨어          │
│  requireFirebaseAuth()  │
└──────────┬──────────────┘
           │
           ├─→ USE_FIREBASE_AUTH=false (개발)
           │   → x-user-id 헤더 검증
           │
           └─→ USE_FIREBASE_AUTH=true (프로덕션)
               → Firebase ID 토큰 검증
```

## 🚀 개발 모드 인증

### 설정

```bash
USE_FIREBASE_AUTH=false
```

### 요청 형식

```http
GET /api/diaries
Headers:
  x-user-id: user123
```

### 미들웨어 처리

```typescript
// backend/src/middleware/auth.ts

export async function requireFirebaseAuth(req, res, next) {
  const USE_FIREBASE_AUTH = process.env.USE_FIREBASE_AUTH === 'true';

  // 개발 모드: x-user-id 헤더 허용
  if (!USE_FIREBASE_AUTH) {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID required (dev mode)'
      });
    }

    req.userId = userId;
    return next();
  }

  // 프로덕션 모드 처리 (아래 참조)
}
```

### 프론트엔드 설정

```typescript
// src/services/apiService.ts

const userId = await UserService.getOrCreateUserId();

const headers = {
  'Content-Type': 'application/json',
  'x-user-id': userId,  // 개발 모드에서만 사용
};
```

### 사용자 ID 생성

```typescript
// src/services/userService.ts

export class UserService {
  private static USER_ID_KEY = '@user_id';

  static async getOrCreateUserId(): Promise<string> {
    let userId = await AsyncStorage.getItem(this.USER_ID_KEY);

    if (!userId) {
      // UUID v4 생성
      userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      await AsyncStorage.setItem(this.USER_ID_KEY, userId);
      logger.log('✅ New user ID created:', userId);
    }

    return userId;
  }
}
```

## 🔥 프로덕션 모드 인증 (Firebase)

### 설정

```bash
USE_FIREBASE_AUTH=true
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

### 요청 형식

```http
GET /api/diaries
Headers:
  Authorization: Bearer <Firebase ID Token>
```

### Firebase ID 토큰 획득 (앱)

```typescript
// src/services/authService.ts

import auth from '@react-native-firebase/auth';

export class AuthService {
  static async getIdToken(): Promise<string> {
    const currentUser = auth().currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Firebase ID 토큰 획득 (자동 갱신)
    const idToken = await currentUser.getIdToken(true);
    return idToken;
  }
}
```

### 미들웨어 검증

```typescript
// backend/src/middleware/auth.ts

import admin from '../config/firebase';

export async function requireFirebaseAuth(req, res, next) {
  const USE_FIREBASE_AUTH = process.env.USE_FIREBASE_AUTH === 'true';

  if (USE_FIREBASE_AUTH) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Bearer token required'
      });
    }

    const idToken = authHeader.substring(7); // "Bearer " 제거

    try {
      // Firebase ID 토큰 검증
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.userId = decodedToken.uid;

      console.log(`✅ Authenticated user: ${decodedToken.uid}`);
      next();
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  }
}
```

### Firebase ID 토큰 구조

```json
{
  "iss": "https://securetoken.google.com/heart-stamp-diary",
  "aud": "heart-stamp-diary",
  "auth_time": 1699456789,
  "user_id": "abc123def456",
  "sub": "abc123def456",
  "iat": 1699460389,
  "exp": 1699463989,
  "email": "user@example.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "email": ["user@example.com"]
    },
    "sign_in_provider": "password"
  }
}
```

## 🔑 관리자 인증

### 용도

배치 작업 트리거, 테스트 알림 전송 등 관리용 API 보호

### 설정

```bash
ADMIN_SECRET=<32바이트 이상 랜덤 문자열>
```

### 요청 형식

```http
POST /api/jobs/trigger-analysis
Headers:
  x-admin-token: <ADMIN_SECRET>
```

### 미들웨어 검증

```typescript
// backend/src/middleware/auth.ts

export function requireAdminToken(req, res, next) {
  const adminToken = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_SECRET;

  if (!expectedToken) {
    return res.status(500).json({
      success: false,
      message: 'Admin authentication not configured'
    });
  }

  if (!adminToken) {
    return res.status(401).json({
      success: false,
      message: 'Admin token required'
    });
  }

  if (adminToken !== expectedToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid admin token'
    });
  }

  console.log(`✅ Admin authenticated from ${req.ip}`);
  next();
}
```

### 보호 대상 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /api/jobs/trigger-analysis` | AI 분석 수동 실행 |
| `POST /api/jobs/trigger-backup` | 백업 수동 실행 |
| `GET /api/jobs/backups` | 백업 목록 조회 |
| `POST /api/push/test-regular` | 일반 푸시 테스트 |
| `POST /api/push/test-ai-comment` | AI 코멘트 푸시 테스트 |
| `POST /api/push/check-receipts` | 푸시 영수증 확인 |
| `GET /api/push/ticket-stats` | 푸시 티켓 통계 |

## 🔄 인증 플로우 비교

### 개발 모드 (TestFlight)

```
1. 앱 시작
   ↓
2. UserService.getOrCreateUserId()
   ↓
3. AsyncStorage에서 userId 조회 또는 생성
   ↓
4. API 요청 시 x-user-id 헤더에 포함
   ↓
5. 백엔드에서 userId 검증 (존재 여부만)
   ↓
6. req.userId 설정
   ↓
7. 다음 미들웨어로 이동
```

### 프로덕션 모드

```
1. 앱 시작
   ↓
2. Firebase 인증 (이메일/소셜 로그인)
   ↓
3. Firebase ID 토큰 획득
   ↓
4. API 요청 시 Authorization 헤더에 포함
   ↓
5. 백엔드에서 Firebase ID 토큰 검증
   - 서명 검증
   - 만료 시간 확인
   - 발급자(issuer) 확인
   ↓
6. req.userId 설정 (decodedToken.uid)
   ↓
7. 다음 미들웨어로 이동
```

## 🛡️ 보안 고려사항

### 토큰 만료 처리

**Firebase ID 토큰 만료**: 1시간

```typescript
// 자동 갱신 (앱에서)
const idToken = await currentUser.getIdToken(true); // force refresh

// 만료 시 에러 (백엔드)
{
  "success": false,
  "message": "Invalid or expired token"
}

// 앱에서 재시도
try {
  await apiService.getDiaries();
} catch (error) {
  if (error.message.includes('expired')) {
    // 토큰 갱신 후 재시도
    const newToken = await AuthService.getIdToken();
    await apiService.getDiaries();
  }
}
```

### 토큰 탈취 방지

- ✅ HTTPS만 사용 (중간자 공격 방지)
- ✅ 토큰을 AsyncStorage에 저장하지 않음 (Firebase SDK가 관리)
- ✅ 짧은 만료 시간 (1시간)
- ✅ 토큰 갱신 메커니즘

### IP 차단 (선택 사항)

```typescript
// 특정 IP 차단
const BLOCKED_IPS = ['1.2.3.4', '5.6.7.8'];

app.use((req, res, next) => {
  if (BLOCKED_IPS.includes(req.ip)) {
    return res.status(403).json({
      message: 'Access denied'
    });
  }
  next();
});
```

## 📊 인증 로깅

### 성공 로그

```typescript
✅ [Firebase Auth] Authenticated user: abc123def456
✅ [Dev Auth] User ID: user123
✅ [Admin Auth] Authenticated admin request from 1.2.3.4
```

### 실패 로그

```typescript
🚫 [Firebase Auth] Missing or invalid Authorization header from 1.2.3.4
❌ [Firebase Auth] Token verification failed: Token expired
🚫 [Dev Auth] Missing x-user-id header from 1.2.3.4
🚫 [Admin Auth] Invalid admin token from 1.2.3.4
```

## 🔄 환경 전환 가이드

### TestFlight → App Store

**1단계: Firebase 인증 활성화**
```bash
# Railway 환경 변수 변경
USE_FIREBASE_AUTH=true
```

**2단계: 프론트엔드 수정**
```typescript
// src/services/apiService.ts

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

// Firebase ID 토큰 추가
if (USE_FIREBASE_AUTH) {
  const idToken = await AuthService.getIdToken();
  headers['Authorization'] = `Bearer ${idToken}`;
} else {
  // 개발 모드
  const userId = await UserService.getOrCreateUserId();
  headers['x-user-id'] = userId;
}
```

**3단계: Firebase 프로젝트 설정**
- Firebase Console에서 iOS 앱 등록
- `GoogleService-Info.plist` 다운로드
- React Native Firebase 패키지 설치

**4단계: 테스트**
- 로그인/로그아웃 테스트
- 토큰 만료 처리 테스트
- 네트워크 오류 처리 테스트

## ✅ 체크리스트

### 개발 환경 (현재)
- ✅ `USE_FIREBASE_AUTH=false`
- ✅ `x-user-id` 헤더 인증
- ✅ UUID v4 사용자 ID
- ✅ AsyncStorage에 저장

### 프로덕션 환경 (예정)
- [ ] `USE_FIREBASE_AUTH=true`
- [ ] Firebase ID 토큰 인증
- [ ] 이메일/소셜 로그인
- [ ] 토큰 자동 갱신
- [ ] 로그아웃 기능
- [ ] 비밀번호 재설정

### 관리자 API
- ✅ `ADMIN_SECRET` 설정
- ✅ `x-admin-token` 헤더 검증
- ✅ Rate Limiting (10req/15min)
- ✅ IP 로깅

## 🎯 권장 사항

### 보안
- 🔐 프로덕션에서는 반드시 Firebase Auth 사용
- 🔑 ADMIN_SECRET은 32바이트 이상
- 🚫 개발 모드에서만 `x-user-id` 허용

### 사용자 경험
- ⚡ 토큰 만료 자동 갱신
- 🔄 네트워크 오류 재시도
- 📱 오프라인 모드 지원 (AsyncStorage 캐싱)

### 모니터링
- 📊 인증 실패율 추적
- 🚨 비정상적인 로그인 시도 감지
- 📝 사용자 활동 로그
