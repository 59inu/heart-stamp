# 인프라 구성 (Infrastructure)

Heart Stamp Diary의 인프라 구성 및 클라우드 서비스 구조를 설명합니다.

## 📐 전체 아키텍처

```
┌─────────────────┐
│   iOS App       │
│ (React Native)  │
└────────┬────────┘
         │ HTTPS
         │ REST API
         ↓
┌─────────────────────────────┐
│  Railway (Cloud Platform)   │
│  ┌─────────────────────┐    │
│  │  Node.js Backend    │    │
│  │  - Express Server   │    │
│  │  - SQLite Database  │    │
│  │  - Background Jobs  │    │
│  └──────┬──────────────┘    │
└─────────┼───────────────────┘
          │
          ├──→ AWS S3 (이미지 저장)
          ├──→ Claude API (AI 분석)
          ├──→ Firebase Admin (푸시 알림)
          └──→ Sentry (에러 추적)
```

## 🚂 Railway (백엔드 호스팅)

### 배포 환경

| 환경 | URL | 용도 |
|------|-----|------|
| **Development** | `https://heart-stamp-dev.up.railway.app` | TestFlight 테스트용 |
| **Production** | (예정) | 실제 App Store 출시용 |

### 자동 배포

- **GitHub 연동**: `main` 브랜치에 push 시 자동 배포
- **빌드 명령어**: `npm run build` (TypeScript → JavaScript)
- **시작 명령어**: `npm start`

### 주요 환경 변수

```bash
# 필수 환경 변수 (프로덕션)
NODE_ENV=production
ENCRYPTION_KEY=<32바이트 이상 랜덤 키>
FIREBASE_SERVICE_ACCOUNT_JSON=<Firebase 서비스 계정 JSON>
ADMIN_SECRET=<관리자 API 시크릿>
ALLOWED_ORIGINS=https://your-app.com

# AI 및 클라우드 서비스
CLAUDE_API_KEY=<Claude API 키>
AWS_ACCESS_KEY_ID=<AWS 액세스 키>
AWS_SECRET_ACCESS_KEY=<AWS 시크릿 키>
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=heart-stamp-diary-dev

# 개발 모드 설정
USE_FIREBASE_AUTH=false  # TestFlight는 false
```

### 헬스 체크

```bash
# Railway 상태 확인
GET https://heart-stamp-dev.up.railway.app/health

# 응답
{
  "status": "ok",
  "message": "Heart Stamp Backend is running"
}
```

## ☁️ AWS S3 (이미지 스토리지)

### 버킷 구조

```
heart-stamp-diary-dev/         # 개발 환경
├── images/                    # 일기 이미지
│   └── <uuid>.jpg
└── backups/                   # 데이터베이스 백업
    └── 2025-11-06_diary.db

heart-stamp-diary-images/      # 프로덕션 환경 (예정)
├── images/
└── backups/
```

### 이미지 업로드 플로우

```
1. 앱에서 이미지 선택
   ↓
2. Base64 인코딩하여 백엔드로 전송
   ↓
3. 백엔드에서 S3로 업로드
   ↓
4. S3 URL 반환
   ↓
5. 데이터베이스에 URL 저장
```

### S3 URL 형식

```
https://<bucket>.s3.<region>.amazonaws.com/images/<uuid>.jpg
```

### IAM 권한

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::heart-stamp-diary-dev",
        "arn:aws:s3:::heart-stamp-diary-dev/*",
        "arn:aws:s3:::heart-stamp-diary-images",
        "arn:aws:s3:::heart-stamp-diary-images/*"
      ]
    }
  ]
}
```

## 🔥 Firebase Admin SDK

### 용도

- **푸시 알림**: Expo Push Token을 통한 알림 전송
- **인증** (선택): Firebase ID 토큰 검증 (프로덕션 전환 시)

### 서비스 계정 설정

**방법 1: 환경 변수 (Railway 권장)**
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**방법 2: 파일 경로 (로컬 개발)**
```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

## 🤖 Claude API (AI 분석)

### 사용 모델

- **Claude 3.5 Haiku**: 빠르고 경제적인 모델
- **비용**: ~$0.80/1M input tokens, ~$4/1M output tokens

### 분석 작업

```
매일 새벽 3시: 전날 작성된 일기에 AI 코멘트 생성
    ↓
감정 분석, 스탬프 추천, 선생님 코멘트 작성
    ↓
데이터베이스에 저장 (암호화)
    ↓
아침 8시 30분: 푸시 알림 전송
```

## 🐛 Sentry (에러 추적)

### 통합 범위

- **프론트엔드**: React Native 앱
  - Crash 리포트
  - ErrorBoundary 에러
  - logger.error/warn 자동 전송

- **백엔드**: (선택 사항)
  - 서버 에러 추적 가능

### 데이터 보호

```typescript
// PII 필터링 (개인정보 제거)
beforeSend(event) {
  delete event.request?.cookies;
  delete event.request?.headers;
  delete event.user?.email;
  delete event.user?.username;
  return event;
}
```

## 📊 환경별 설정 비교

| 설정 | Development | Production |
|------|-------------|------------|
| **Railway URL** | `heart-stamp-dev.up.railway.app` | TBD |
| **S3 Bucket** | `heart-stamp-diary-dev` | `heart-stamp-diary-images` |
| **Firebase Auth** | Disabled (`USE_FIREBASE_AUTH=false`) | Enabled |
| **CORS** | `*` (모든 오리진) | 특정 도메인만 |
| **Encryption** | Custom Key | Custom Key |
| **Sentry** | Enabled | Enabled |
| **Analytics** | MOCK Mode | Real Firebase (예정) |

## 🔄 백업 전략

### 자동 백업

```
매일 새벽 4시: SQLite 데이터베이스 백업
    ↓
로컬 저장 (./backups/)
    ↓
S3 업로드 (backups/YYYY-MM-DD_diary.db)
    ↓
14일 후 자동 삭제 (로컬 + S3)
```

### 수동 백업

```bash
# 관리자 API로 수동 백업 트리거
POST /api/jobs/trigger-backup
Header: x-admin-token: <ADMIN_SECRET>
```

## 📈 확장 계획

### Phase 1 (현재)
- Railway Dev 환경
- S3 이미지 저장
- SQLite 데이터베이스
- Claude API 통합

### Phase 2 (프로덕션)
- Railway Production 환경 분리
- Firebase Auth 활성화
- PostgreSQL 마이그레이션 (선택)
- CDN 추가 (CloudFront)

### Phase 3 (스케일링)
- Redis 캐싱
- 로드 밸런싱
- Multi-region 배포
- Real-time 기능 (WebSocket)
