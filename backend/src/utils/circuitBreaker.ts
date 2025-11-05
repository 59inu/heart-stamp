/**
 * Circuit Breaker Pattern
 *
 * API 장애 시 빠른 실패(fail-fast)로 시스템을 보호합니다.
 *
 * 상태:
 * - CLOSED: 정상 작동 (요청 전달)
 * - OPEN: 장애 감지 (요청 차단)
 * - HALF_OPEN: 복구 테스트 (일부 요청 허용)
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private state: CircuitState = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,        // 실패 임계값
    private readonly timeout: number = 60000,      // Open 상태 유지 시간 (1분)
    private readonly halfOpenMaxAttempts: number = 3  // Half-open에서 허용할 시도 횟수
  ) {}

  /**
   * Circuit Breaker로 함수 실행
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // OPEN 상태: 타임아웃 확인
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.timeout) {
        console.log('🔄 Circuit breaker: OPEN → HALF_OPEN');
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 성공 시 처리
   */
  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      console.log(`✅ Circuit breaker: Success in HALF_OPEN (${this.successCount}/${this.halfOpenMaxAttempts})`);

      // Half-open에서 충분한 성공 → CLOSED
      if (this.successCount >= this.halfOpenMaxAttempts) {
        console.log('🟢 Circuit breaker: HALF_OPEN → CLOSED (recovered)');
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      // CLOSED 상태에서 성공 시 실패 카운트 리셋
      this.failureCount = 0;
    }
  }

  /**
   * 실패 시 처리
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Half-open에서 실패 → 즉시 OPEN
      console.log('🔴 Circuit breaker: HALF_OPEN → OPEN (recovery failed)');
      this.state = 'OPEN';
      this.successCount = 0;
    } else if (this.state === 'CLOSED' && this.failureCount >= this.threshold) {
      // CLOSED에서 임계값 도달 → OPEN
      console.log(`🔴 Circuit breaker: CLOSED → OPEN (${this.failureCount} failures)`);
      this.state = 'OPEN';
    }
  }

  /**
   * 현재 상태 조회
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * 상태 강제 리셋 (테스트/디버깅용)
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    console.log('🔄 Circuit breaker manually reset');
  }
}
