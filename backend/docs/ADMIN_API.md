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
      "hasGeneratedImage": true,
      "imageUri": "https://example.com/images/abc123.png",
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
| hasGeneratedImage | AI 생성 이미지(나노바나나) 완료 여부 |
| imageUri | 이미지 URL (없으면 null) |
| moodTag | 감정 태그 (항상 복호화되어 반환) |
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

### 어제 vs 오늘 일일 현황 스냅샷

```
GET /analytics/daily-snapshot
```

어제와 오늘의 모든 핵심 지표를 비교하여 한 눈에 볼 수 있는 대시보드 데이터를 제공합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-01-27",
      "diaries": {
        "total": 45,
        "withImage": 8,
        "avgLength": 245,
        "activeUsers": 32,
        "newUsers": 5,
        "returningUsers": 27
      },
      "aiComments": {
        "total": 12,
        "sonnet": 10,
        "haiku": 2,
        "fallback": 0,
        "pending": 33,
        "avgImportanceScore": 14.2
      },
      "images": {
        "completed": 8,
        "failed": 2,
        "pending": 3
      },
      "cost": {
        "total": 0.122,
        "sonnet": 0.1,
        "haiku": 0.002
      }
    },
    "yesterday": {
      "date": "2025-01-26",
      "diaries": {
        "total": 38,
        "withImage": 12,
        "avgLength": 230,
        "activeUsers": 28,
        "newUsers": 3,
        "returningUsers": 25
      },
      "aiComments": {
        "total": 35,
        "sonnet": 28,
        "haiku": 7,
        "fallback": 0,
        "pending": 3,
        "avgImportanceScore": 13.8
      },
      "images": {
        "completed": 12,
        "failed": 1,
        "pending": 0
      },
      "cost": {
        "total": 0.287,
        "sonnet": 0.28,
        "haiku": 0.007
      }
    },
    "comparison": {
      "diaries": { "diff": 7, "percentage": 18.4 },
      "activeUsers": { "diff": 4, "percentage": 14.3 },
      "aiComments": { "diff": -23, "percentage": -65.7 },
      "images": { "diff": -4, "percentage": -33.3 }
    },
    "hourlyTrend": {
      "today": [
        { "hour": 0, "count": 2 },
        { "hour": 1, "count": 1 },
        { "hour": 22, "count": 8 },
        { "hour": 23, "count": 5 }
      ],
      "yesterday": [
        { "hour": 0, "count": 1 },
        { "hour": 1, "count": 3 },
        { "hour": 22, "count": 10 },
        { "hour": 23, "count": 6 }
      ]
    },
    "alerts": {
      "warnings": [
        {
          "type": "pending_comments",
          "count": 3,
          "message": "어제 일기 중 AI 코멘트 대기: 3개"
        },
        {
          "type": "image_failed",
          "count": 3,
          "message": "이미지 생성 실패: 3건 (오늘: 2, 어제: 1)"
        }
      ],
      "errors": [],
      "info": [
        {
          "type": "batch_completed",
          "time": "03:00",
          "message": "배치 작업 완료: 어제 일기 35개에 AI 코멘트 생성"
        }
      ]
    },
    "userStats": {
      "activeUserCount": 1234,
      "validUserCount": 1180
    }
  }
}
```

**필드 설명:**

**today / yesterday** (일별 데이터):
| 필드 | 설명 |
|-----|------|
| date | 날짜 (YYYY-MM-DD, KST 기준) |
| diaries.total | 일기 작성 수 |
| diaries.withImage | 그림일기 수 |
| diaries.avgLength | 평균 일기 길이 (글자 수) |
| diaries.activeUsers | 활성 사용자 수 (일기 작성한 사용자) |
| diaries.newUsers | 신규 사용자 수 (첫 일기) |
| diaries.returningUsers | 재방문 사용자 수 |
| aiComments.total | AI 코멘트 생성 수 |
| aiComments.sonnet | Sonnet 모델 사용 수 |
| aiComments.haiku | Haiku 모델 사용 수 |
| aiComments.fallback | Fallback 코멘트 수 |
| aiComments.pending | 코멘트 대기 중인 일기 수 |
| aiComments.avgImportanceScore | 평균 중요도 점수 |
| images.completed | 이미지 생성 완료 수 |
| images.failed | 이미지 생성 실패 수 |
| images.pending | 이미지 생성 대기/진행 중 수 |
| cost.total | 총 비용 (USD) |
| cost.sonnet | Sonnet 비용 (USD) |
| cost.haiku | Haiku 비용 (USD) |

**comparison** (비교):
| 필드 | 설명 |
|-----|------|
| diaries | 일기 작성 수 비교 |
| activeUsers | 활성 사용자 수 비교 |
| aiComments | AI 코멘트 수 비교 |
| images | 그림일기 수 비교 |
| diff | 차이 (오늘 - 어제) |
| percentage | 증감률 (%) |

**hourlyTrend** (시간대별 추이):
| 필드 | 설명 |
|-----|------|
| today | 오늘 시간대별 작성 수 (0-23시, KST) |
| yesterday | 어제 시간대별 작성 수 |
| hour | 시간 (0-23) |
| count | 해당 시간대 일기 작성 수 |

**alerts** (알림):
| 필드 | 설명 |
|-----|------|
| warnings | 경고 (주의 필요) |
| errors | 에러 (즉시 조치 필요) |
| info | 정보성 알림 |
| type | 알림 타입 |
| count | 발생 건수 |
| message | 알림 메시지 |
| time | 발생 시간 (옵션) |

**userStats** (사용자 통계):
| 필드 | 설명 |
|-----|------|
| activeUserCount | 활성 사용자 수 (일기 작성 이력이 있는 사용자, 삭제 포함) |
| validUserCount | 유효 사용자 수 (삭제하지 않은 일기가 있는 사용자) |

**알림 타입:**
- `pending_comments`: AI 코멘트 대기 중
- `image_failed`: 이미지 생성 실패
- `fallback_occurred`: Fallback 코멘트 발생 (에러)
- `batch_completed`: 배치 작업 완료 (정보)

**활용:**
- 일일 운영 현황 모니터링
- 어제 대비 오늘 성장/감소 추이 파악
- 배치 작업 정상 작동 여부 확인
- 즉시 조치가 필요한 이슈 발견
- 시간대별 사용자 활동 패턴 분석

**대시보드 구성 예시:**
```
┌─────────────────────────────────────┐
│ 📝 일기 작성                        │
│ 오늘: 45개  어제: 38개  (+18.4%)  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 👥 활성 사용자                      │
│ 오늘: 32명  어제: 28명  (+14.3%)  │
└─────────────────────────────────────┘

⚠️ 주의 필요 항목:
• AI 코멘트 대기: 3개 (어제 일기)
• 이미지 생성 실패: 3건

✅ 정상 작동 중:
• 배치 작업: 정상 실행 (03:00)
```

---

## 감정 분석 API (Emotion Analytics)

감정 신호등(mood)과 감정 태그(moodTag)에 대한 종합 분석을 제공합니다.

### 1. 감정 신호등 분포 분석

```
GET /analytics/emotion/mood-distribution
```

감정 신호등(Red/Yellow/Green)의 분포와 평균 일기 길이, 연속성 분석을 제공합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "distribution": [
      { "mood": "yellow", "count": 156, "percentage": 45.0 },
      { "mood": "red", "count": 104, "percentage": 30.0 },
      { "mood": "green", "count": 87, "percentage": 25.0 }
    ],
    "avgDiaryLength": [
      { "mood": "red", "avgLength": 150 },
      { "mood": "yellow", "avgLength": 200 },
      { "mood": "green", "avgLength": 250 }
    ],
    "continuity": {
      "avgRedStreak": 2.3,
      "maxRedStreak": 7,
      "avgGreenStreak": 4.1,
      "maxGreenStreak": 15,
      "avgRedToGreenDays": 3.5
    }
  }
}
```

**필드 설명:**

| 필드 | 설명 |
|-----|------|
| distribution | 신호등별 분포 (빈도, 백분율) |
| avgDiaryLength | 신호등별 평균 일기 길이 (글자 수) |
| continuity.avgRedStreak | 평균 Red 연속 일수 |
| continuity.maxRedStreak | 최대 Red 연속 일수 |
| continuity.avgGreenStreak | 평균 Green 연속 일수 |
| continuity.avgRedToGreenDays | Red → Green 전환 평균 소요 일수 |

**활용:**
- 전체 사용자의 감정 분포 파악
- 기분이 나쁠 때 일기를 덜 쓰는 경향 발견
- 감정 회복 패턴 이해

---

### 2. 감정 태그 사용 빈도 분석

```
GET /analytics/emotion/mood-tags
```

감정 태그의 TOP 20, 미사용 태그, 주간 트렌드를 제공합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "topTags": [
      { "tag": "행복함", "count": 450, "percentage": 12.0 },
      { "tag": "피곤함", "count": 380, "percentage": 10.1 },
      { "tag": "뿌듯함", "count": 320, "percentage": 8.5 }
    ],
    "unusedTags": [
      { "tag": "환희", "lastUsed": "2024-10-15T12:00:00Z", "totalCount": 3 },
      { "tag": "경악", "lastUsed": "2024-09-20T10:30:00Z", "totalCount": 5 }
    ],
    "weeklyTrend": [
      { "tag": "외로움", "thisWeek": 55, "lastWeek": 25, "changePercent": 120 },
      { "tag": "우울함", "thisWeek": 74, "lastWeek": 40, "changePercent": 85 },
      { "tag": "설렘", "thisWeek": 20, "lastWeek": 50, "changePercent": -60 }
    ]
  }
}
```

**필드 설명:**

| 필드 | 설명 |
|-----|------|
| topTags | TOP 20 감정 태그 (빈도, 백분율) |
| unusedTags | 최근 90일 미사용 + 전체 10회 미만 태그 |
| weeklyTrend | 이번주 vs 지난주 비교 (변화율 포함) |

**활용:**
- 사용되지 않는 태그 제거 결정
- 유사 태그 병합 검토 (예: "슬픔"+"우울함")
- 급상승 태그로 사용자 감정 트렌드 파악

---

### 3. 신호등 × 감정 태그 매핑

```
GET /analytics/emotion/mood-tag-mapping
```

각 신호등(Red/Yellow/Green)별로 가장 많이 사용되는 감정 태그 TOP 5를 제공합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "byMood": [
      {
        "mood": "red",
        "topTags": [
          { "tag": "슬픔", "count": 80, "percentage": 40.0 },
          { "tag": "우울함", "count": 50, "percentage": 25.0 },
          { "tag": "화남", "count": 40, "percentage": 20.0 }
        ]
      },
      {
        "mood": "green",
        "topTags": [
          { "tag": "행복함", "count": 100, "percentage": 50.0 },
          { "tag": "뿌듯함", "count": 60, "percentage": 30.0 },
          { "tag": "감사함", "count": 30, "percentage": 15.0 }
        ]
      }
    ]
  }
}
```

**필드 설명:**

| 필드 | 설명 |
|-----|------|
| byMood | 신호등별 TOP 5 감정 태그 |
| mood | 신호등 색상 (red/yellow/green) |
| topTags | 해당 신호등에서 자주 사용되는 태그 |

**활용:**
- Red 일기의 감정 패턴 이해 (슬픔, 우울, 화)
- Green 일기의 긍정 패턴 파악 (행복, 뿌듯, 감사)
- 신호등과 태그의 일관성 검증

---

### 4. 사용자 감정 세그먼트 분석

```
GET /analytics/emotion/user-segments
```

사용자를 감정 패턴으로 분류하고, 작성 빈도와 Green 비율의 상관관계를 분석합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "type": "positive",
        "userCount": 45,
        "percentage": 35.0,
        "avgDiariesPerWeek": 5.2,
        "topTags": []
      },
      {
        "type": "neutral",
        "userCount": 50,
        "percentage": 39.1,
        "avgDiariesPerWeek": 3.8,
        "topTags": []
      },
      {
        "type": "struggling",
        "userCount": 20,
        "percentage": 15.6,
        "avgDiariesPerWeek": 2.5,
        "topTags": []
      },
      {
        "type": "mixed",
        "userCount": 13,
        "percentage": 10.2,
        "avgDiariesPerWeek": 4.1,
        "topTags": []
      }
    ],
    "writingFrequencyCorrelation": {
      "frequent": { "avgGreenRatio": 60.0, "count": 25 },
      "moderate": { "avgGreenRatio": 45.0, "count": 50 },
      "occasional": { "avgGreenRatio": 35.0, "count": 30 }
    }
  }
}
```

**필드 설명:**

| 필드 | 설명 |
|-----|------|
| segments | 사용자 감정 패턴 분류 |
| segments.type | positive(Green 70%+), neutral(Yellow 50%+), struggling(Red 50%+), mixed |
| writingFrequencyCorrelation.frequent | 주 5회 이상 작성하는 사용자 |
| writingFrequencyCorrelation.moderate | 주 2-4회 작성하는 사용자 |
| writingFrequencyCorrelation.occasional | 주 1회 이하 작성하는 사용자 |

**인사이트:**
- 일기를 자주 쓸수록 Green 비율 증가 (규칙적 작성의 긍정적 효과)
- Struggling 그룹(Red 50%+)에 특별한 응원 메시지 제공 검토
- Positive 그룹의 작성 습관을 다른 사용자에게 권장

---

### 5. AI 코멘트와 감정의 상관관계

```
GET /analytics/emotion/ai-correlation
```

신호등별 AI 모델 사용률, 평균 중요도 점수, 도장 분포를 분석합니다.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "modelUsageByMood": [
      {
        "mood": "red",
        "sonnetRatio": 75.0,
        "haikuRatio": 25.0,
        "avgImportanceScore": 28.0
      },
      {
        "mood": "green",
        "sonnetRatio": 30.0,
        "haikuRatio": 70.0,
        "avgImportanceScore": 12.0
      }
    ],
    "stampDistributionByMood": [
      {
        "mood": "red",
        "stamps": [
          { "stampType": "keep_going", "count": 60, "percentage": 60.0 },
          { "stampType": "nice", "count": 30, "percentage": 30.0 }
        ]
      },
      {
        "mood": "green",
        "stamps": [
          { "stampType": "excellent", "count": 50, "percentage": 50.0 },
          { "stampType": "good", "count": 40, "percentage": 40.0 }
        ]
      }
    ]
  }
}
```

**필드 설명:**

| 필드 | 설명 |
|-----|------|
| modelUsageByMood | 신호등별 AI 모델 사용률 (Sonnet/Haiku) |
| avgImportanceScore | 신호등별 평균 중요도 점수 (/40) |
| stampDistributionByMood | 신호등별 도장 분포 |

**인사이트:**
- Red 일기는 중요도가 높아 Sonnet 사용률 75%
- Green 일기는 간단한 칭찬으로 Haiku 사용률 70%
- Red 일기에는 "keep_going" 도장, Green에는 "excellent" 도장 빈번

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
