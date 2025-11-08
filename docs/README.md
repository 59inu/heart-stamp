# Heart Stamp Diary - 프로젝트 문서

Heart Stamp Diary의 전체 시스템 구조와 작동 원리를 설명하는 문서 모음입니다.

## 📚 문서 목록

### 1. [개발 워크플로우 (WORKFLOW.md)](./WORKFLOW.md) ⭐ 필독

브랜치 전략, 배포 프로세스, 버전 관리를 설명합니다.

**주요 내용**:
- Git 브랜치 전략 (main/dev)
- 개발 → 테스트 → 배포 워크플로우
- Semantic Versioning
- PR & Squash Merge
- 환경별 빌드 설정
- 릴리즈 체크리스트

**이런 분들에게 추천**:
- 처음 프로젝트에 참여하는 경우
- 배포 프로세스를 이해하고 싶은 경우
- 버전 관리 방법을 알고 싶은 경우

---

### 2. [인프라 구성 (INFRASTRUCTURE.md)](./INFRASTRUCTURE.md)

클라우드 인프라와 배포 환경을 설명합니다.

**주요 내용**:
- Railway 백엔드 호스팅
- AWS S3 이미지 스토리지
- Firebase Admin SDK (푸시 알림)
- Claude API 통합
- Sentry 에러 추적
- 환경 변수 설정
- 백업 전략

**이런 분들에게 추천**:
- 배포 환경을 이해하고 싶은 경우
- 환경 변수 설정이 필요한 경우
- 클라우드 서비스 연동을 확인하고 싶은 경우

---

### 3. [서버 아키텍처 (ARCHITECTURE.md)](./ARCHITECTURE.md)

백엔드 서버의 설계와 작동 방식을 설명합니다.

**주요 내용**:
- Express 서버 구조
- API 라우트 설계
- 요청 처리 플로우
- 배치 작업 (AI 분석, 백업)
- 서비스 간 통신
- 에러 처리 전략
- 성능 최적화

**이런 분들에게 추천**:
- 서버 전체 구조를 이해하고 싶은 경우
- API 엔드포인트를 확인하고 싶은 경우
- 배치 작업 스케줄을 알고 싶은 경우

---

### 3. [보안 전략 (SECURITY.md)](./SECURITY.md)

데이터 보호와 보안 설계를 설명합니다.

**주요 내용**:
- AES-256-GCM 암호화
- Rate Limiting (DDoS 방어)
- CORS 설정
- SQL Injection 방어
- 소프트 삭제 (Soft Delete)
- 동시성 제어
- Sentry 개인정보 보호
- 보안 체크리스트

**이런 분들에게 추천**:
- 데이터 암호화 방식을 이해하고 싶은 경우
- 보안 취약점을 점검하고 싶은 경우
- 개인정보 보호 방식을 확인하고 싶은 경우

---

### 4. [인증 전략 (AUTHENTICATION.md)](./AUTHENTICATION.md)

사용자 인증과 세션 관리를 설명합니다.

**주요 내용**:
- 개발 모드 인증 (x-user-id)
- 프로덕션 인증 (Firebase)
- 관리자 인증 (ADMIN_SECRET)
- 인증 플로우 비교
- 토큰 관리
- 환경 전환 가이드

**이런 분들에게 추천**:
- 인증 시스템을 이해하고 싶은 경우
- 개발/프로덕션 전환 방법을 알고 싶은 경우
- Firebase Auth 통합 방법을 확인하고 싶은 경우

---

### 5. [데이터베이스 설계 (DATABASE.md)](./DATABASE.md)

SQLite 데이터베이스 구조와 관리를 설명합니다.

**주요 내용**:
- 테이블 스키마 (diaries, push_tokens, reports)
- 인덱스 설계
- SQLite 최적화 (WAL, 캐시, busy timeout)
- 암호화 통합
- 동시성 제어 (Optimistic Locking)
- 소프트 삭제 전략
- 백업 및 복원
- 마이그레이션 전략

**이런 분들에게 추천**:
- 데이터베이스 구조를 이해하고 싶은 경우
- 성능 최적화 방법을 알고 싶은 경우
- 데이터 마이그레이션이 필요한 경우

---

### 6. [AI 통합 (AI_INTEGRATION.md)](./AI_INTEGRATION.md)

Claude AI 통합과 자동화 작업을 설명합니다.

**주요 내용**:
- Claude 3.5 Haiku 사용
- 프롬프트 설계
- 배치 분석 작업 (새벽 3시)
- 푸시 알림 작업 (아침 8시 30분)
- Circuit Breaker 패턴
- 재시도 로직
- 비용 최적화
- 에러 처리

**이런 분들에게 추천**:
- AI 분석 작동 방식을 이해하고 싶은 경우
- 배치 작업 스케줄을 확인하고 싶은 경우
- Claude API 비용을 예측하고 싶은 경우

---

## 🎯 빠른 시작 가이드

### 처음 시작하는 경우

1. **[인프라 구성](./INFRASTRUCTURE.md)** 먼저 읽기
   - 전체 시스템 구조 파악
   - 환경 변수 설정 이해

2. **[서버 아키텍처](./ARCHITECTURE.md)** 읽기
   - 백엔드 구조 이해
   - API 엔드포인트 확인

3. **필요에 따라 세부 문서 참조**

### 배포가 필요한 경우

1. **[인프라 구성](./INFRASTRUCTURE.md)** → Railway 배포 섹션
2. **[보안 전략](./SECURITY.md)** → 환경 변수 체크리스트
3. **[인증 전략](./AUTHENTICATION.md)** → 환경 전환 가이드

### 문제 해결이 필요한 경우

1. **데이터베이스 에러** → [DATABASE.md](./DATABASE.md) → 트러블슈팅
2. **인증 실패** → [AUTHENTICATION.md](./AUTHENTICATION.md) → 인증 플로우
3. **AI 분석 오류** → [AI_INTEGRATION.md](./AI_INTEGRATION.md) → 에러 처리

---

## 📊 주요 기술 스택

### 백엔드
- **런타임**: Node.js 18+
- **프레임워크**: Express.js
- **데이터베이스**: SQLite (better-sqlite3)
- **AI**: Claude 3.5 Haiku
- **클라우드**: Railway, AWS S3
- **푸시 알림**: Firebase Admin SDK

### 프론트엔드
- **프레임워크**: React Native (Expo)
- **언어**: TypeScript
- **네비게이션**: React Navigation
- **상태 관리**: AsyncStorage
- **에러 추적**: Sentry

### 보안
- **암호화**: AES-256-GCM
- **인증**: Firebase Auth
- **전송 암호화**: HTTPS/TLS
- **Rate Limiting**: express-rate-limit

---

## 🔗 관련 링크

- **GitHub Repository**: (추가 예정)
- **Railway Dashboard**: https://railway.app
- **Firebase Console**: https://console.firebase.google.com
- **AWS S3 Console**: https://console.aws.amazon.com/s3
- **Claude API Docs**: https://docs.anthropic.com
- **Sentry Dashboard**: https://sentry.io

---

## 📝 문서 업데이트 이력

### 2025-11-08
- ✅ 초기 문서 작성
- ✅ 6개 주요 문서 완성
  - INFRASTRUCTURE.md
  - ARCHITECTURE.md
  - SECURITY.md
  - AUTHENTICATION.md
  - DATABASE.md
  - AI_INTEGRATION.md

---

## 🤝 기여 가이드

문서 개선 제안이나 오타 수정은 언제든 환영합니다!

1. 문서 오류 발견 시 이슈 생성
2. 개선 제안 사항 공유
3. 새로운 섹션 추가 제안

---

## 📞 문의

기술적 질문이나 문서 관련 문의사항이 있으시면 연락주세요.

---

**마지막 업데이트**: 2025-11-08
**작성자**: Heart Stamp Diary Team
