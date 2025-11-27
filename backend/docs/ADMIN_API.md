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
