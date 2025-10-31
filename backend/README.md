# Stamp Diary Backend

도장 일기 앱의 백엔드 서버입니다.

## 주요 기능

- 일기 데이터 수신 및 관리
- Claude API를 통한 AI 코멘트 생성
- 매일 밤 2시 자동 배치 작업 실행

## 설치

```bash
npm install
```

## 환경 설정

`.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
CLAUDE_API_KEY=your_anthropic_api_key_here
PORT=3000
```

## 실행

### 개발 모드
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
npm start
```

## API 엔드포인트

- `GET /health` - 서버 상태 확인
- `POST /api/diaries` - 일기 업로드
- `GET /api/diaries/:id/ai-comment` - AI 코멘트 조회
- `POST /api/diaries/:id/analyze` - 즉시 AI 분석 실행
- `POST /api/jobs/trigger-analysis` - 배치 작업 수동 실행

## 배치 작업

매일 밤 2시에 자동으로 실행되어 AI 코멘트가 없는 일기들을 분석합니다.

수동 실행:
```bash
curl -X POST http://localhost:3000/api/jobs/trigger-analysis
```
