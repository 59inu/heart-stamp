/**
 * Retry Utilities
 *
 * 네트워크 요청 실패 시 자동 재시도 기능을 제공합니다.
 */

export interface RetryOptions {
  maxRetries?: number;       // 최대 재시도 횟수 (기본: 3)
  baseDelay?: number;        // 기본 대기 시간 (기본: 1000ms)
  maxDelay?: number;         // 최대 대기 시간 (기본: 30000ms)
  exponential?: boolean;     // 지수 백오프 사용 여부 (기본: true)
  onRetry?: (attempt: number, error: any) => void;  // 재시도 시 콜백
}

/**
 * Exponential Backoff with Jitter
 *
 * 재시도 간격을 지수적으로 증가시키되, 약간의 랜덤성을 추가하여
 * 동시에 많은 요청이 재시도되는 것을 방지합니다.
 *
 * @example
 * const result = await retryWithBackoff(
 *   async () => await fetch('https://api.example.com'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponential = true,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 마지막 시도면 에러 throw
      if (attempt === maxRetries) {
        console.error(`❌ Max retries (${maxRetries}) exceeded`);
        throw error;
      }

      // 재시도 대기 시간 계산
      let delay: number;
      if (exponential) {
        // 지수 백오프: 1s → 2s → 4s → 8s ...
        delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      } else {
        // 선형: 1s → 1s → 1s ...
        delay = baseDelay;
      }

      // Jitter 추가 (±25% 랜덤)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      delay = Math.max(0, delay + jitter);

      console.log(
        `⚠️  Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms...`
      );
      console.log(`   Error: ${(error as any).message || error}`);

      // 콜백 호출
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // 대기
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 조건부 재시도
 *
 * 특정 조건을 만족하는 에러만 재시도합니다.
 *
 * @example
 * await retryWithCondition(
 *   async () => await api.call(),
 *   (error) => error.status === 503,  // 503 에러만 재시도
 *   { maxRetries: 3 }
 * );
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: any) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponential = true,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 재시도 조건 확인
      if (!shouldRetry(error)) {
        console.log(`⚠️  Error is not retryable, throwing immediately`);
        throw error;
      }

      // 마지막 시도면 에러 throw
      if (attempt === maxRetries) {
        console.error(`❌ Max retries (${maxRetries}) exceeded`);
        throw error;
      }

      // 재시도 대기 시간 계산
      let delay = exponential
        ? Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
        : baseDelay;

      // Jitter 추가
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      delay = Math.max(0, delay + jitter);

      console.log(
        `⚠️  Attempt ${attempt + 1}/${maxRetries} failed (retryable), retrying in ${Math.round(delay)}ms...`
      );
      console.log(`   Error: ${(error as any).message || error}`);

      // 콜백 호출
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // 대기
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 타임아웃이 있는 재시도
 *
 * @example
 * const result = await retryWithTimeout(
 *   async () => await fetch('https://api.example.com'),
 *   5000,  // 5초 타임아웃
 *   { maxRetries: 3 }
 * );
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(
    () => withTimeout(fn(), timeoutMs),
    options
  );
}

/**
 * Promise에 타임아웃 추가
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 일반적인 재시도 가능 에러 체크
 */
export function isRetryableError(error: any): boolean {
  // HTTP 상태 코드 체크
  if (error.status) {
    const status = error.status;
    // 5xx 서버 에러, 429 Rate Limit, 408 Timeout은 재시도 가능
    return (
      status >= 500 ||
      status === 429 ||
      status === 408
    );
  }

  // 네트워크 에러 체크
  if (error.code) {
    const retryableCodes = [
      'ETIMEDOUT',
      'ECONNABORTED',
      'ECONNRESET',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];
    return retryableCodes.includes(error.code);
  }

  // 메시지 체크
  if (error.message) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')
    );
  }

  // 기본값: 재시도 불가
  return false;
}
