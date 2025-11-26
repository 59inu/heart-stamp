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
