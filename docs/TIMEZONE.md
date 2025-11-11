# 하트스탬프 다이어리 타임존 원칙

## 개요

하트스탬프 다이어리는 전 세계 모든 타임존의 사용자를 지원하기 위해 체계적인 타임존 처리 원칙을 따릅니다. 이 문서는 프론트엔드와 백엔드에서 일관되게 적용되는 타임존 규칙을 정의합니다.

---

## 1️⃣ 저장 원칙: UTC Midnight Normalization

### 규칙
모든 일기 날짜는 **사용자 로컬 캘린더 날짜 기준 자정 UTC**로 저장합니다.

### 이유
- 시간 정보 제거로 타임존 문제 원천 차단
- 일기는 "날짜" 단위로 관리되며, 시간 정보는 불필요
- 데이터베이스에서 날짜 비교 쿼리 단순화

### 구현 예시
```typescript
// src/screens/DiaryWriteScreen/hooks/useDiarySave.ts

// 사용자가 "2025-11-09"에 작성 → 2025-11-09T00:00:00.000Z 저장
const normalizedDate = new Date(
  Date.UTC(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  )
);

const createData = {
  date: normalizedDate.toISOString(),
  content,
  // ...
};
```

### 적용 위치
- `src/screens/DiaryWriteScreen/hooks/useDiarySave.ts:77-83` (일기 생성)

---

## 2️⃣ 계산 원칙: Server-Side UTC

### 규칙
백엔드는 항상 **UTC 기준**으로 Week/Month 경계를 계산합니다.

### 이유
- 모든 사용자에게 일관된 Week/Month 정의 제공
- 서버 위치나 설정에 관계없이 동일한 결과 보장
- ISO 8601 국제 표준 준수

### Week 계산 (ISO 8601)
```typescript
// backend/src/routes/reportRoutes.ts:36-48

// ISO 8601 기준: 1월 4일이 속한 주의 월요일이 1주차 시작
const jan4 = new Date(Date.UTC(year, 0, 4));
const jan4Day = (jan4.getUTCDay() + 6) % 7; // 월요일=0
const firstMonday = new Date(jan4);
firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day);

const targetMonday = new Date(firstMonday);
targetMonday.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);

const startDate = targetMonday;
const endDate = new Date(targetMonday);
endDate.setUTCDate(targetMonday.getUTCDate() + 6);
endDate.setUTCHours(23, 59, 59, 999); // 해당 일의 끝까지 포함
```

### Month 계산
```typescript
// backend/src/routes/reportRoutes.ts:194-199

const startDate = new Date(Date.UTC(year, month - 1, 1));
const endDate = new Date(Date.UTC(year, month - 1, 1));
endDate.setUTCMonth(endDate.getUTCMonth() + 1);
endDate.setUTCDate(0); // 전월 마지막 날
endDate.setUTCHours(23, 59, 59, 999);
```

### 적용 위치
- `backend/src/routes/reportRoutes.ts` (주간/월간 리포트 API)
- `backend/src/services/reportService.ts` (리포트 생성 로직)

---

## 3️⃣ 호환 원칙: 24-Hour Buffer

### 규칙
Week/Month 완료 체크 시 **24시간 버퍼**를 추가하여 타임존 차이를 흡수합니다.

### 이유
- GMT+9 (한국) 사용자가 월요일 00:01에 주간 리포트 조회 시 "아직 완료 안됨" 에러 방지
- GMT-12 ~ GMT+14 모든 타임존 지원
- 사용자 경험 개선 (기다릴 필요 없음)

### 구현 예시
```typescript
// backend/src/routes/reportRoutes.ts:49-59

// 타임존 차이를 고려하여 24시간 여유
const now = new Date();
const endDateWithBuffer = new Date(endDate);
endDateWithBuffer.setHours(endDateWithBuffer.getHours() + 24);

if (endDateWithBuffer > now) {
  return res.status(400).json({
    success: false,
    message: 'Week not completed yet',
  });
}
```

### 적용 위치
- `backend/src/routes/reportRoutes.ts` (주간/월간 리포트 조회)

---

## 4️⃣ 표시 원칙: Client-Side Local

### 규칙
프론트엔드는 API 응답의 UTC 날짜를 **사용자 디바이스 타임존**으로 변환하여 표시합니다.

### 이유
- 사용자는 자신의 로컬 시간으로 모든 날짜 확인
- React Native의 Date 객체는 자동으로 디바이스 타임존 사용
- date-fns의 format 함수는 로컬 타임존 기준 포맷팅

### 구현 예시
```typescript
// 프론트엔드 전역 (date-fns 사용)
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// API 응답: "2025-11-09T00:00:00.000Z"
// 한국 사용자: "11월 9일" 표시
format(new Date(diary.date), 'M월 d일', { locale: ko })
```

### Week 계산 (프론트엔드)
```typescript
// src/utils/dateUtils.ts:5-10
import { getISOWeek, getISOWeekYear } from 'date-fns';

export function getWeekNumber(date: Date): { year: number; week: number } {
  return {
    year: getISOWeekYear(date),
    week: getISOWeek(date),
  };
}
```

### 적용 위치
- `src/utils/dateUtils.ts` (Week 계산)
- `src/screens/**/*.tsx` (날짜 표시 전역)

---

## 5️⃣ 스케줄링 원칙: Asia/Seoul

### 규칙
Cron job 스케줄링은 **한국 시간(Asia/Seoul) 기준**으로 실행됩니다.

### 이유
- AI 배치 처리: 한국 새벽 3시에 전날 일기 분석
- 푸시 알림: 한국 아침 8시 30분에 알림 발송
- "어제" 계산: 한국 시간 기준 어제 일기 조회

### 환경변수 설정
```bash
# Railway 환경변수 필수
TZ=Asia/Seoul
```

### 영향받는 코드
```typescript
// backend/src/services/database.ts:376-381
// AI 배치: 어제 일기 조회
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

// backend/src/index.ts
cron.schedule('0 3 * * *', async () => {
  // 한국 시간 새벽 3시 실행
});

cron.schedule('30 8 * * *', async () => {
  // 한국 시간 아침 8시 30분 실행
});
```

### TZ 미설정 시 문제
| 항목 | 의도 (Asia/Seoul) | 실제 (UTC) | 차이 |
|------|------------------|-----------|------|
| AI 배치 | 03:00 KST | 03:00 UTC = 12:00 KST | +9시간 |
| 푸시 알림 | 08:30 KST | 08:30 UTC = 17:30 KST | +9시간 |
| "어제" 일기 | 전날 일기 | 9시간 차이 | 날짜 오류 |

### 적용 위치
- Railway 환경변수: `TZ=Asia/Seoul`
- `backend/src/index.ts` (Cron job 스케줄)
- `backend/src/services/database.ts` ("어제" 계산)

---

## ✅ 개발자 체크리스트

### 새로운 날짜 관련 기능 추가 시
- [ ] **일기 저장**: `Date.UTC()` 사용하여 자정 UTC 저장
- [ ] **Week/Month 계산**: UTC 메서드 (`getUTCDate`, `Date.UTC`) 사용
- [ ] **Week 넘버링**: `date-fns`의 `getISOWeek`/`getISOWeekYear` 사용
- [ ] **리포트 조회**: `ORDER BY createdAt DESC LIMIT 1` 포함
- [ ] **완료 체크**: 24시간 버퍼 추가
- [ ] **날짜 표시**: date-fns `format` 사용 (자동 로컬 타임존)

### 배포 시
- [ ] Railway 환경변수: `TZ=Asia/Seoul` 설정 확인
- [ ] Cron job 실행 시간 확인 (한국 시간 기준)
- [ ] 다양한 타임존에서 테스트 (GMT-12, UTC, GMT+14)

---

## 🐛 과거 버그 사례

### 1. November 9 일기 누락 (2025-11-12 수정)
**문제**: 11월 3-9일에 일기 4개가 있는데 주간 리포트에서 "분석할 기억이 쌓이지 않았어요" 표시

**원인**:
- 백엔드가 endDate를 `2025-11-08T15:00:00.000Z` (한국 11/9 00:00)로 계산
- 일기는 `2025-11-09T00:00:00.000Z` (UTC 자정)로 저장
- 11/9 일기가 범위에서 제외됨 (4개 → 3개)

**해결**: UTC 기준 계산으로 변경, 23:59:59.999까지 포함

**관련 커밋**: `2cf9739`, `1824ca5`

### 2. 월요일 새벽 리포트 조회 실패 (2025-11-12 수정)
**문제**: GMT+9 사용자가 월요일 00:01에 주간 리포트 조회 시 "Week not completed yet" 에러

**원인**: 백엔드는 UTC 기준으로 아직 일요일이라고 판단

**해결**: 24시간 버퍼 추가

**관련 커밋**: `1824ca5`

---

## 📚 참고 문서

- [ISO 8601 Week Date](https://en.wikipedia.org/wiki/ISO_week_date)
- [date-fns Documentation](https://date-fns.org/)
- [Node.js Cron Timezone](https://github.com/node-cron/node-cron#timezone)
