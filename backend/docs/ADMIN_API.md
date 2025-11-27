# Admin API 가이드

## 인증

모든 Admin API는 `x-admin-token` 헤더가 필요합니다.

```
x-admin-token: {ADMIN_TOKEN}
```

## Base URL

```
https://api.heartstamp.kr/api/admin
```

## Rate Limit

- IP당 분당 30회

---

## 코멘트 API

### 코멘트 목록 조회

```
GET /comments
```

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|-----|-------|------|
| startDate | string | X | - | 시작일 (YYYY-MM-DD) |
| endDate | string | X | - | 종료일 (YYYY-MM-DD) |
| status | string | X | all | `normal` / `fallback` / `all` |
| decrypt | boolean | X | false | 코멘트 복호화 여부 |

**Response (200):**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "diaryId": "abc123",
      "userId": "user1",
      "model": "sonnet",
      "createdAt": "2025-01-15T12:00:00",
      "isFallback": false,
      "aiComment": "코멘트 내용"
    }
  ]
}
```

> `decrypt=false`일 경우 `aiComment`는 `"[암호화됨]"`으로 표시

---

### 코멘트 생성

```
POST /comments/:diaryId
```

코멘트가 없는 일기에 수동으로 AI 코멘트를 생성합니다. (Sonnet 모델 사용)

**Path Parameters:**

| 파라미터 | 설명 |
|---------|------|
| diaryId | 일기 ID |

**Response (201):**

```json
{
  "success": true,
  "message": "AI comment created successfully",
  "data": {
    "diaryId": "abc123",
    "date": "2025-01-15",
    "aiComment": "생성된 코멘트",
    "model": "sonnet",
    "importanceScore": 3,
    "stampType": "heart"
  }
}
```

**Response (409 - 이미 코멘트 있음):**

```json
{
  "success": false,
  "message": "Diary already has an AI comment. Use PUT to regenerate."
}
```

---

### 코멘트 수정 (재생성)

```
PUT /comments/:diaryId
```

기존 코멘트를 덮어쓰고 새로 생성합니다. (Sonnet 모델 사용)

**Path Parameters:**

| 파라미터 | 설명 |
|---------|------|
| diaryId | 일기 ID |

**Response (200):**

```json
{
  "success": true,
  "message": "AI comment regenerated successfully",
  "data": {
    "diaryId": "abc123",
    "date": "2025-01-15",
    "aiComment": "새로 생성된 코멘트",
    "model": "sonnet",
    "importanceScore": 3,
    "stampType": "heart"
  }
}
```

---

### 코멘트 삭제

```
DELETE /comments/:diaryId
```

**Path Parameters:**

| 파라미터 | 설명 |
|---------|------|
| diaryId | 일기 ID |

**Response (200):**

```json
{
  "success": true,
  "message": "AI comment deleted successfully",
  "data": {
    "diaryId": "abc123",
    "date": "2025-01-15"
  }
}
```

**Response (400 - 코멘트 없음):**

```json
{
  "success": false,
  "message": "Diary has no AI comment to delete."
}
```

---

### 코멘트 통계 조회

```
GET /comments/stats
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "activeUserCount": 50,
    "validUserCount": 45,
    "modelStats": {
      "total": 120,
      "sonnet": { "count": 80, "percentage": 67 },
      "haiku": { "count": 35, "percentage": 29 },
      "fallback": { "count": 5, "percentage": 4 }
    },
    "costEstimate": {
      "total": 0.835,
      "sonnet": 0.8,
      "haiku": 0.035,
      "currency": "USD"
    },
    "dailyTrend": [
      { "date": "2025-01-27", "sonnet": 5, "haiku": 3, "fallback": 0 }
    ],
    "weeklyTrend": [
      { "week": "2025-01-20", "sonnet": 25, "haiku": 15, "fallback": 2 }
    ]
  }
}
```

| 필드 | 설명 |
|-----|------|
| activeUserCount | 활성 사용자 (일기 작성 이력 있음, 삭제 포함) |
| validUserCount | 유효 사용자 (삭제되지 않은 일기 보유) |
| modelStats | 모델별 코멘트 생성 통계 |
| costEstimate | 비용 추정 (Sonnet $0.01/건, Haiku $0.001/건) |
| dailyTrend | 일별 추이 (최근 14일) |
| weeklyTrend | 주별 추이 (최근 12주) |

---

## 일기 API

### 일기 목록 조회

```
GET /diaries
```

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|-----|-------|------|
| startDate | string | X | - | 일기 날짜 시작 (YYYY-MM-DD) |
| endDate | string | X | - | 일기 날짜 종료 (YYYY-MM-DD) |
| hasComment | boolean | X | - | 코멘트 유무 필터 |
| userId | string | X | - | 특정 유저 필터 |
| decrypt | boolean | X | false | 내용 복호화 여부 |

**Response (200):**

```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "diaryId": "abc123",
      "userId": "user1",
      "date": "2025-01-15",
      "content": "일기 내용",
      "hasComment": true,
      "hasGeneratedImage": false,
      "moodTag": "행복",
      "createdAt": "2025-01-15T12:00:00"
    }
  ]
}
```

| 필드 | 설명 |
|-----|------|
| diaryId | 일기 ID |
| userId | 유저 ID |
| date | 일기 날짜 (YYYY-MM-DD) |
| content | 일기 내용 (`decrypt=false`일 경우 `[암호화됨]`) |
| hasComment | AI 코멘트 존재 여부 |
| hasGeneratedImage | AI 생성 이미지(나노바나나) 여부 |
| moodTag | 감정 태그 (`decrypt=false`일 경우 `[암호화됨]`) |
| createdAt | 생성일시 |

---

### 일기 통계 조회

```
GET /diaries/stats
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalDiaries": 150,
    "withComment": 140,
    "withoutComment": 10,
    "withGeneratedImage": 25,
    "avgDiariesPerUser": 3.2,
    "writersThisWeek": 12,
    "writersLastWeek": 15,
    "moodDistribution": {
      "red": 30,
      "yellow": 50,
      "green": 60,
      "none": 10
    },
    "dailyTrend": [
      { "date": "2025-01-27", "count": 8 },
      { "date": "2025-01-26", "count": 12 }
    ]
  }
}
```

| 필드 | 설명 |
|-----|------|
| totalDiaries | 총 일기 수 |
| withComment | 코멘트 있는 일기 수 |
| withoutComment | 코멘트 없는 일기 수 |
| withGeneratedImage | 그림일기(나노바나나) 수 |
| avgDiariesPerUser | 유저당 평균 일기 수 |
| writersThisWeek | 이번 주 작성자 수 |
| writersLastWeek | 지난 주 작성자 수 |
| moodDistribution | 감정 분포 (red/yellow/green/none) |
| dailyTrend | 일별 작성 추이 (최근 14일) |

---

## 프롬프트 API

AI 코멘트 생성, 중요도 분석, 장면 추출에 사용되는 프롬프트를 관리합니다.

### 프롬프트 목록 조회

```
GET /prompts
```

**Response (200):**

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "comment",
      "name": "코멘트 생성",
      "content": "당신은 따뜻한 초등학교 담임 선생님입니다...",
      "variables": ["responseLength", "emotionTag", "diaryContent"],
      "version": 1,
      "updatedAt": "2025-01-15T12:00:00",
      "updatedBy": "admin"
    }
  ]
}
```

---

### 특정 프롬프트 조회

```
GET /prompts/:id
```

**Path Parameters:**

| 파라미터 | 설명 |
|---------|------|
| id | 프롬프트 ID (`comment`, `importance`, `scene`) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment",
    "name": "코멘트 생성",
    "content": "프롬프트 내용...",
    "variables": ["responseLength", "emotionTag", "diaryContent"],
    "version": 1,
    "updatedAt": "2025-01-15T12:00:00",
    "updatedBy": "admin"
  }
}
```

**Response (404 - 프롬프트 없음):**

```json
{
  "success": false,
  "message": "Prompt not found: comment"
}
```

---

### 프롬프트 저장/수정

```
PUT /prompts/:id
```

**Path Parameters:**

| 파라미터 | 설명 |
|---------|------|
| id | 프롬프트 ID |

**Request Body:**

```json
{
  "name": "코멘트 생성",
  "content": "당신은 따뜻한 초등학교 담임 선생님입니다.\n학생의 일기를 읽고 {{responseLength}}로...",
  "variables": ["responseLength", "emotionTag", "diaryContent"]
}
```

| 필드 | 타입 | 필수 | 설명 |
|-----|------|-----|------|
| name | string | O | 프롬프트 이름 |
| content | string | O | 프롬프트 내용 (`{{변수}}` 형태로 변수 사용) |
| variables | string[] | X | 사용되는 변수 목록 |

**Response (200):**

```json
{
  "success": true,
  "message": "Prompt saved successfully",
  "data": {
    "id": "comment",
    "name": "코멘트 생성",
    "content": "...",
    "variables": ["responseLength", "emotionTag", "diaryContent"]
  }
}
```

> 저장 시 캐시가 자동으로 초기화되며, 다음 API 호출부터 새 프롬프트가 적용됩니다.

---

### 프롬프트 캐시 초기화

```
POST /prompts/cache/clear
```

서버 메모리에 캐시된 프롬프트를 초기화합니다. 다음 API 호출 시 DB에서 다시 로드합니다.

**Response (200):**

```json
{
  "success": true,
  "message": "Prompt cache cleared successfully"
}
```

---

### 프롬프트 버전 히스토리 조회

```
GET /prompts/:id/history
```

프롬프트의 모든 이전 버전을 조회합니다. 프롬프트를 수정할 때마다 이전 버전이 히스토리에 저장됩니다.

**Path Parameters:**

| 파라미터 | 설명 |
|---------|------|
| id | 프롬프트 ID (`comment`, `importance`, `scene`) |

**Response (200):**

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 5,
      "promptId": "comment",
      "name": "코멘트 생성",
      "content": "이전 버전의 프롬프트 내용...",
      "variables": ["responseLength", "emotionTag", "diaryContent"],
      "version": 2,
      "createdAt": "2025-01-15T12:00:00",
      "createdBy": "admin"
    }
  ]
}
```

> 결과는 버전 내림차순 (최신 → 과거)으로 정렬됩니다.

---

### 프롬프트 특정 버전으로 복원

```
POST /prompts/:id/restore/:version
```

히스토리에 저장된 특정 버전으로 프롬프트를 복원합니다. 복원 시 현재 버전은 히스토리에 저장되고, 선택한 버전이 새 버전으로 적용됩니다.

**Path Parameters:**

| 파라미터 | 설명 |
|---------|------|
| id | 프롬프트 ID |
| version | 복원할 버전 번호 |

**Response (200):**

```json
{
  "success": true,
  "message": "Prompt 'comment' restored to version 2",
  "data": {
    "id": "comment",
    "name": "코멘트 생성",
    "content": "복원된 프롬프트 내용...",
    "variables": ["responseLength", "emotionTag", "diaryContent"],
    "version": 4,
    "updatedAt": "2025-01-16T10:00:00",
    "updatedBy": "admin"
  }
}
```

**Response (404 - 버전 없음):**

```json
{
  "success": false,
  "message": "Version 2 of prompt 'comment' not found"
}
```

---

### 기본 프롬프트 목록

| ID | 이름 | 변수 | 용도 |
|---|---|---|---|
| `comment` | 코멘트 생성 | responseLength, emotionTag, diaryContent | AI 코멘트 생성 |
| `importance` | 중요도 분석 | diaryContent | Sonnet/Haiku 모델 선택용 분석 |
| `scene` | 장면 추출 | diaryContent | 그림일기 이미지 생성용 장면 추출 |

---

## Analytics API (Phase 1)

운영 인사이트를 위한 고급 통계 API입니다.

### 시간대/요일별 작성 패턴 분석

```
GET /analytics/time-patterns
```

사용자들이 일기를 작성하는 시간대와 요일 패턴을 분석합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "hourly": [
      { "hour": 0, "count": 5, "percentage": 2.3 },
      { "hour": 1, "count": 2, "percentage": 0.9 },
      { "hour": 22, "count": 45, "percentage": 20.5 }
    ],
    "weekday": [
      { "day": 0, "dayName": "일요일", "count": 30, "percentage": 14.2 },
      { "day": 1, "dayName": "월요일", "count": 35, "percentage": 16.5 },
      { "day": 6, "dayName": "토요일", "count": 25, "percentage": 11.8 }
    ]
  }
}
```

**필드 설명:**

| 필드 | 설명 |
|-----|------|
| hourly | 시간대별 작성 패턴 (0-23시) |
| hour | 시간 (0-23) |
| weekday | 요일별 작성 패턴 |
| day | 요일 (0=일요일, 6=토요일) |
| dayName | 요일 이름 |
| count | 해당 시간대/요일 작성 수 |
| percentage | 전체 대비 비율 (%) |

**활용:**
- 사용자가 주로 일기를 작성하는 시간대 파악
- 푸시 알림 최적 시간 결정
- 요일별 트래픽 패턴 분석 (주말 vs 평일)

---

### 사용자 세그멘테이션 & 리텐션 분석

```
GET /analytics/user-cohorts
```

사용자 건강도, 리텐션율, 코호트 분석을 제공합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "segments": {
      "power_users": 15,
      "active_users": 42,
      "new_users": 128,
      "churned_users": 23
    },
    "retention": {
      "week1": 65,
      "week2": 45,
      "week4": 32,
      "allTime": 28
    },
    "cohortAnalysis": [
      {
        "cohortWeek": "2025-W48",
        "newUsers": 25,
        "week1Retention": 68,
        "week2Retention": 48,
        "week4Retention": 36
      },
      {
        "cohortWeek": "2025-W47",
        "newUsers": 30,
        "week1Retention": 70,
        "week2Retention": 50,
        "week4Retention": 40
      }
    ]
  }
}
```

**필드 설명:**

**segments** (사용자 세그먼트):
| 필드 | 설명 |
|-----|------|
| power_users | 파워 유저 (10개 이상 작성) |
| active_users | 활성 유저 (3-9개 작성) |
| new_users | 신규 유저 (1-2개 작성) |
| churned_users | 이탈 유저 (최근 30일 미작성) |

**retention** (전체 리텐션):
| 필드 | 설명 |
|-----|------|
| week1 | 1주 후 리텐션율 (%) |
| week2 | 2주 후 리텐션율 (%) |
| week4 | 4주 후 리텐션율 (%) |
| allTime | 전체 활성 사용자 비율 (%) |

**cohortAnalysis** (코호트 분석, 최근 12주):
| 필드 | 설명 |
|-----|------|
| cohortWeek | 코호트 주차 (YYYY-W##) |
| newUsers | 해당 주 신규 사용자 수 |
| week1Retention | 1주 후 리텐션율 (%) |
| week2Retention | 2주 후 리텐션율 (%) |
| week4Retention | 4주 후 리텐션율 (%) |

**활용:**
- 사용자 건강도 모니터링 (파워/액티브/신규/이탈 비율)
- 리텐션 추이 파악 (개선/악화 여부)
- 주차별 코호트 비교로 제품 개선 효과 측정

---

### 비용 예측 및 최적화 분석

```
GET /analytics/cost-forecast
```

현재 비용, 예측, 최적화 제안을 제공합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "current": {
      "daily": 0.45,
      "weekly": 3.15,
      "monthly": 13.5
    },
    "forecast": {
      "nextWeek": 3.2,
      "nextMonth": 14.1
    },
    "breakdown": {
      "comments": {
        "total": 125.5,
        "sonnet": 98.4,
        "haiku": 27.1
      },
      "reports": {
        "total": 12.5,
        "weekly": 7.5,
        "monthly": 5.0
      }
    },
    "optimization": {
      "potentialSavings": 88.56,
      "recommendedThreshold": 12
    }
  }
}
```

**필드 설명:**

**current** (현재 비용, USD):
| 필드 | 설명 |
|-----|------|
| daily | 일평균 비용 (최근 30일 기준) |
| weekly | 주평균 비용 |
| monthly | 월평균 비용 |

**forecast** (예측 비용, USD):
| 필드 | 설명 |
|-----|------|
| nextWeek | 다음 주 예상 비용 (최근 7일 평균 기준) |
| nextMonth | 다음 달 예상 비용 |

**breakdown** (비용 분해, USD):
| 필드 | 설명 |
|-----|------|
| comments.total | 코멘트 총 비용 (누적) |
| comments.sonnet | Sonnet 코멘트 비용 ($0.01/건) |
| comments.haiku | Haiku 코멘트 비용 ($0.001/건) |
| reports.total | 리포트 총 비용 (누적) |
| reports.weekly | 주간 리포트 비용 ($0.015/건) |
| reports.monthly | 월간 리포트 비용 ($0.02/건) |

**optimization** (최적화 제안):
| 필드 | 설명 |
|-----|------|
| potentialSavings | 절감 가능 금액 (USD) - 모든 코멘트를 Haiku로 전환 시 |
| recommendedThreshold | 추천 importanceScore 임계값 (Sonnet 평균의 80%) |

**비용 단가:**
- Sonnet 코멘트: $0.01/건
- Haiku 코멘트: $0.001/건
- 주간 리포트: $0.015/건
- 월간 리포트: $0.02/건

**활용:**
- 실시간 비용 모니터링
- 향후 비용 예측으로 예산 관리
- Sonnet/Haiku 밸런스 최적화
- importanceScore 임계값 조정으로 비용 절감

---

### 그림일기 사용 vs 일기 작성량 상관관계 분석

```
GET /analytics/image-correlation
```

그림일기(AI 이미지 생성) 기능 사용과 일기 작성량의 상관관계를 다각도로 분석합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "basic": {
      "withImage": {
        "userCount": 45,
        "avgDiaries": 8.5,
        "avgImagesPerUser": 5.2
      },
      "withoutImage": {
        "userCount": 123,
        "avgDiaries": 4.2
      },
      "difference": {
        "avgDiariesDiff": 4.3,
        "percentage": 102.4
      }
    },
    "bySegment": {
      "power_users": {
        "withImage": 12,
        "withoutImage": 2,
        "imageUsageRate": 85.7
      },
      "active_users": {
        "withImage": 25,
        "withoutImage": 17,
        "imageUsageRate": 59.5
      },
      "new_users": {
        "withImage": 8,
        "withoutImage": 104,
        "imageUsageRate": 7.1
      }
    },
    "retention": {
      "withImage": {
        "week1": 72,
        "week2": 58,
        "week4": 45
      },
      "withoutImage": {
        "week1": 58,
        "week2": 38,
        "week4": 25
      }
    },
    "firstUsageImpact": {
      "before30Days": 2.1,
      "after30Days": 4.5,
      "increaseRate": 114.3
    },
    "byUsageRate": [
      {
        "imageRateRange": "0%",
        "userCount": 123,
        "avgDiaries": 4.2
      },
      {
        "imageRateRange": "1-25%",
        "userCount": 25,
        "avgDiaries": 6.5
      },
      {
        "imageRateRange": "26-50%",
        "userCount": 10,
        "avgDiaries": 9.8
      },
      {
        "imageRateRange": "51-75%",
        "userCount": 5,
        "avgDiaries": 12.3
      },
      {
        "imageRateRange": "76-100%",
        "userCount": 5,
        "avgDiaries": 15.7
      }
    ],
    "correlation": {
      "coefficient": 0.68,
      "strength": "strong"
    }
  }
}
```

**필드 설명:**

**basic** (기본 비교):
| 필드 | 설명 |
|-----|------|
| withImage.userCount | 그림일기 사용자 수 |
| withImage.avgDiaries | 그림일기 사용자 평균 일기 수 |
| withImage.avgImagesPerUser | 사용자당 평균 그림일기 수 |
| withoutImage.userCount | 그림일기 미사용자 수 |
| withoutImage.avgDiaries | 미사용자 평균 일기 수 |
| difference.avgDiariesDiff | 평균 일기 수 차이 |
| difference.percentage | 차이 비율 (%) |

**bySegment** (세그먼트별 분석):
| 필드 | 설명 |
|-----|------|
| power_users | 파워 유저 (10개 이상) |
| active_users | 액티브 유저 (3-9개) |
| new_users | 신규 유저 (1-2개) |
| withImage | 그림일기 사용자 수 |
| withoutImage | 미사용자 수 |
| imageUsageRate | 그림일기 사용률 (%) |

**retention** (리텐션 비교):
| 필드 | 설명 |
|-----|------|
| withImage | 그림일기 사용자 리텐션 (%) |
| withoutImage | 미사용자 리텐션 (%) |
| week1/week2/week4 | 1주/2주/4주 후 리텐션율 |

**firstUsageImpact** (첫 사용 전후 영향):
| 필드 | 설명 |
|-----|------|
| before30Days | 첫 사용 30일 전 평균 일기 수/주 |
| after30Days | 첫 사용 30일 후 평균 일기 수/주 |
| increaseRate | 증가율 (%) |

**byUsageRate** (사용 빈도별 분석):
| 필드 | 설명 |
|-----|------|
| imageRateRange | 그림일기 비율 범위 (0%, 1-25%, 26-50%, 51-75%, 76-100%) |
| userCount | 해당 범위 사용자 수 |
| avgDiaries | 평균 총 일기 수 |

**correlation** (상관계수):
| 필드 | 설명 |
|-----|------|
| coefficient | 피어슨 상관계수 (-1 ~ 1) |
| strength | 상관관계 강도 (weak/moderate/strong) |

**상관계수 해석:**
- `coefficient > 0`: 양의 상관관계 (그림일기 ↑ → 일기 작성 ↑)
- `coefficient < 0`: 음의 상관관계
- `|coefficient| >= 0.7`: 강한 상관관계 (strong)
- `0.4 <= |coefficient| < 0.7`: 중간 상관관계 (moderate)
- `|coefficient| < 0.4`: 약한 상관관계 (weak)

**활용:**
- 그림일기 기능의 사용자 참여도 영향 측정
- 파워 유저가 그림일기를 더 많이 사용하는지 검증
- 그림일기 첫 사용 후 행동 변화 분석
- 그림일기 사용률과 일기 작성량의 선형 관계 파악
- 제품 개선 우선순위 결정 (그림일기 기능 강화 vs 다른 기능)

**인사이트 예시:**
- "그림일기 사용자는 비사용자보다 평균 2배 더 많이 일기를 씁니다"
- "파워 유저의 85%가 그림일기를 사용합니다"
- "그림일기를 처음 써본 후 작성 빈도가 114% 증가했습니다"
- "상관계수 0.68 (strong) → 그림일기 사용과 일기 작성량은 강한 양의 상관관계"

---

## 공통 에러 응답

**404 - 리소스 없음:**

```json
{
  "success": false,
  "message": "Diary not found: {diaryId}"
}
```

**500 - 서버 에러:**

```json
{
  "success": false,
  "message": "Failed to ...",
  "error": "에러 메시지"
}
```
