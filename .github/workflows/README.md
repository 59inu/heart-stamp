# GitHub Actions Workflows

Railway Free 플랜에서 cron job이 정상 작동하도록 서버를 깨우는 워크플로우입니다.

## 워크플로우 목록

### 1. Daily AI Analysis (`daily-ai-analysis.yml`)
- **실행 시간**: 매일 새벽 3시 (KST)
- **기능**: AI 코멘트 분석 배치 작업 트리거
- **API**: `POST /api/jobs/trigger-analysis`

### 2. Daily Push Notification (`daily-push-notification.yml`)
- **실행 시간**: 매일 아침 8시 29분 (KST)
- **기능**: 서버를 깨워서 8시 30분 푸시 알림 cron job 실행 준비
- **API**: `GET /health`

### 3. Daily Backup (`daily-backup.yml`)
- **실행 시간**: 매일 새벽 3시 59분 (KST)
- **기능**: 서버를 깨워서 4시 백업 cron job 실행 준비
- **API**: `GET /health`

## 설정 방법

### 1. GitHub Secrets 추가

GitHub 저장소 Settings → Secrets and variables → Actions → New repository secret

다음 두 개의 secret을 추가하세요:

#### `RAILWAY_URL`
Railway 배포 URL (끝에 슬래시 없이)
```
https://heart-stamp-dev.up.railway.app
```

#### `ADMIN_SECRET`
Railway 환경 변수의 ADMIN_SECRET 값
```
your_admin_secret_here
```

### 2. 워크플로우 활성화

- GitHub 저장소의 Actions 탭으로 이동
- 각 워크플로우가 나타나는지 확인
- "workflow_dispatch"로 수동 실행 테스트 가능

### 3. 확인 방법

#### 수동 테스트
1. Actions 탭 → 워크플로우 선택
2. "Run workflow" 버튼 클릭
3. 실행 로그 확인

#### 자동 실행 확인
- Actions 탭에서 매일 실행 기록 확인
- Railway 로그에서 cron job 실행 확인

## 타임존 참고

- GitHub Actions cron은 **UTC 기준**
- KST = UTC + 9시간

| KST 시간 | UTC 시간 | 워크플로우 |
|---------|---------|----------|
| 03:00   | 18:00   | AI Analysis |
| 03:59   | 18:59   | Backup Wake |
| 08:29   | 23:29   | Push Wake |

## 문제 해결

### 워크플로우가 실행되지 않는 경우
1. GitHub Secrets이 올바르게 설정되었는지 확인
2. Actions 탭에서 워크플로우가 활성화되어 있는지 확인
3. 수동으로 "Run workflow" 테스트

### API 호출이 실패하는 경우
1. Railway URL이 올바른지 확인 (https:// 포함, 끝에 / 없음)
2. ADMIN_SECRET이 Railway 환경 변수와 일치하는지 확인
3. Railway 서버가 정상 작동하는지 확인

## 비용

- **Private 저장소 무료 사용량**: 월 2000분
- **이 워크플로우 사용량**: 약 10-15분/월
- **결론**: 여유롭게 무료로 사용 가능 ✅
