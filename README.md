# 도장 일기 (Heart Stamp) 📔

AI 선생님이 코멘트와 도장을 달아주는 일기 앱입니다.

## 주요 기능

- 📝 **일기 작성**: 간단하고 직관적인 인터페이스로 일기를 작성할 수 있습니다
- 💾 **로컬 저장**: Realm 데이터베이스를 사용하여 일기를 기기에 안전하게 저장합니다
- 🤖 **AI 코멘트**: Anthropic Claude API를 통해 따뜻한 코멘트를 받습니다
- 🌟 **도장 시스템**: AI가 일기를 분석하여 적절한 도장을 찍어줍니다
  - 🌟 **아주 잘했어요** (excellent)
  - 😊 **잘했어요** (good)
  - 👍 **좋아요** (nice)
  - 💪 **계속 노력해요** (keep_going)
- ⏰ **자동 배치 작업**: 매일 밤 2시에 자동으로 AI 코멘트가 생성됩니다

## 기술 스택

### 모바일 앱
- **React Native** (Expo)
- **TypeScript**
- **AsyncStorage** - 로컬 데이터 저장
- **React Navigation** - 화면 네비게이션
- **date-fns** - 날짜 포맷팅

### 백엔드 서버
- **Node.js** + **Express**
- **TypeScript**
- **Anthropic Claude API** - AI 코멘트 생성
- **node-cron** - 배치 작업 스케줄링

## 프로젝트 구조

```
stamp-diary/
├── src/                    # 모바일 앱 소스
│   ├── models/            # 데이터 모델
│   ├── screens/           # 화면 컴포넌트
│   ├── navigation/        # 네비게이션 설정
│   ├── services/          # API 및 저장소 서비스
│   └── components/        # 재사용 가능한 컴포넌트
├── backend/               # 백엔드 서버
│   └── src/
│       ├── routes/        # API 라우트
│       ├── services/      # Claude API 서비스
│       ├── jobs/          # 배치 작업
│       └── types/         # TypeScript 타입
└── README.md
```

## 설치 및 실행

### 1. 백엔드 서버 설정

```bash
# backend 폴더로 이동
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 CLAUDE_API_KEY를 설정하세요

# 개발 서버 실행
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

### 2. 모바일 앱 실행

```bash
# 프로젝트 루트 폴더에서
npm install

# iOS 시뮬레이터에서 실행
npm run ios

# Android 에뮬레이터에서 실행
npm run android

# 웹 브라우저에서 실행
npm run web
```

## API 엔드포인트

### 백엔드 API

- `GET /health` - 서버 상태 확인
- `POST /api/diaries` - 일기 업로드
- `GET /api/diaries/:id/ai-comment` - AI 코멘트 가져오기
- `POST /api/diaries/:id/analyze` - 특정 일기 즉시 분석 (테스트용)
- `GET /api/diaries/pending` - AI 분석 대기 중인 일기 목록
- `POST /api/jobs/trigger-analysis` - 배치 작업 수동 실행 (테스트용)

## 사용 방법

1. **일기 작성**
   - 앱을 열고 우측 하단의 ✏️ 버튼을 눌러 새 일기를 작성합니다
   - 오늘 하루 있었던 일을 자유롭게 작성하고 저장합니다

2. **AI 코멘트 받기**
   - 저장된 일기는 자동으로 서버에 업로드됩니다
   - 매일 밤 2시에 배치 작업이 실행되어 AI 선생님이 코멘트를 달아줍니다
   - 다음날 앱을 열면 AI 코멘트와 도장을 확인할 수 있습니다

3. **일기 목록 보기**
   - 메인 화면에서 작성한 모든 일기를 날짜순으로 볼 수 있습니다
   - 일기를 탭하면 전체 내용과 AI 코멘트를 확인할 수 있습니다

## 테스트

### 즉시 AI 코멘트 받기 (테스트용)

배치 작업을 기다리지 않고 즉시 AI 코멘트를 받고 싶다면:

```bash
# 일기 ID를 확인한 후
curl -X POST http://localhost:3000/api/diaries/[일기ID]/analyze

# 또는 전체 배치 작업 실행
curl -X POST http://localhost:3000/api/jobs/trigger-analysis
```

## 환경 변수

### backend/.env

```env
CLAUDE_API_KEY=your_claude_api_key_here
PORT=3000
```

Claude API 키는 [Anthropic Console](https://console.anthropic.com/)에서 발급받을 수 있습니다.

## 배포

### 🚂 Railway 배포 (권장, 무료)

1. **Railway 가입**
   - https://railway.app 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 생성**
   - Dashboard → "New Project"
   - "Deploy from GitHub repo" 선택
   - `59inu/heart-stamp` 저장소 선택

3. **환경 변수 설정**
   - 프로젝트 Settings → Variables 탭
   - 다음 변수들을 추가:
   ```
   CLAUDE_API_KEY=sk-ant-xxx...
   PORT=3000
   ADMIN_SECRET=your_secure_random_string_here
   ALLOWED_ORIGINS=*
   ```

4. **자동 배포**
   - Git push 시 자동으로 배포됩니다
   - 빌드 로그에서 진행 상황 확인 가능

5. **공개 URL 확인**
   - Settings → Domains 탭
   - 생성된 URL 확인 (예: `https://heart-stamp.up.railway.app`)

6. **프론트엔드 업데이트**
   `src/services/apiService.ts` 파일 수정:
   ```typescript
   const API_BASE_URL = __DEV__
     ? 'http://192.168.0.14:3000/api'
     : 'https://heart-stamp.up.railway.app/api';  // Railway URL로 변경
   ```

### 백엔드 수동 배포

1. TypeScript 빌드:
```bash
cd backend
npm run build
```

2. 프로덕션 실행:
```bash
npm start
```

3. 클라우드 플랫폼 (Heroku, AWS, Google Cloud 등)에 배포

### 모바일 앱 배포

1. `src/services/apiService.ts`의 `API_BASE_URL`을 실제 서버 URL로 변경
2. Expo EAS Build를 사용하여 앱 빌드:
```bash
eas build --platform ios
eas build --platform android
```

## 향후 개선 사항

- [ ] 클라우드 데이터베이스 연동 (백엔드에서 실제 DB 사용)
- [ ] 사용자 인증 시스템
- [ ] 일기 이미지 첨부 기능
- [ ] 도장 이미지 디자인 개선
- [ ] 통계 및 감정 분석 대시보드
- [ ] 일기 백업 및 동기화 기능
- [ ] 푸시 알림 (AI 코멘트 도착 시)

## 라이선스

MIT License

## 제작자

Made with ❤️ using Claude Code
