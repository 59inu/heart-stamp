/**
 * 에러 메시지 한글화 유틸리티
 * 기술적인 에러 메시지를 사용자 친화적인 한글 메시지로 변환
 */

export enum ErrorContext {
  DIARY_UPLOAD = 'DIARY_UPLOAD',
  DIARY_FETCH = 'DIARY_FETCH',
  DIARY_DELETE = 'DIARY_DELETE',
  REPORT_GENERATE = 'REPORT_GENERATE',
  REPORT_FETCH = 'REPORT_FETCH',
  SYNC = 'SYNC',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  IMAGE_UPLOAD = 'IMAGE_UPLOAD',
  NETWORK = 'NETWORK',
  GENERAL = 'GENERAL',
}

interface ErrorMessageMap {
  [key: string]: string;
}

/**
 * 네트워크 에러 메시지
 */
const NETWORK_ERROR_MESSAGES: ErrorMessageMap = {
  'Network Error': '인터넷 연결을 확인해주세요',
  'ERR_NETWORK': '인터넷 연결을 확인해주세요',
  'ECONNABORTED': '요청 시간이 초과되었어요. 다시 시도해주세요',
  'timeout': '요청 시간이 초과되었어요. 다시 시도해주세요',
  'ETIMEDOUT': '요청 시간이 초과되었어요. 다시 시도해주세요',
  'ECONNREFUSED': '서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요',
  'ENOTFOUND': '서버를 찾을 수 없어요. 인터넷 연결을 확인해주세요',
};

/**
 * 서버 상태 코드별 메시지
 */
const HTTP_STATUS_MESSAGES: { [key: number]: string } = {
  400: '잘못된 요청이에요. 다시 시도해주세요',
  401: '인증이 필요해요. 다시 로그인해주세요',
  403: '권한이 없어요',
  404: '요청한 정보를 찾을 수 없어요',
  408: '요청 시간이 초과되었어요',
  429: '너무 많은 요청을 보냈어요. 잠시 후 다시 시도해주세요',
  500: '서버에 문제가 발생했어요. 잠시 후 다시 시도해주세요',
  502: '서버에 일시적인 문제가 있어요',
  503: '서버가 일시적으로 사용 불가능해요',
  504: '서버 응답 시간이 초과되었어요',
};

/**
 * 컨텍스트별 기본 메시지
 */
const CONTEXT_DEFAULT_MESSAGES: { [key in ErrorContext]: string } = {
  [ErrorContext.DIARY_UPLOAD]: '일기 저장에 실패했어요',
  [ErrorContext.DIARY_FETCH]: '일기를 불러올 수 없어요',
  [ErrorContext.DIARY_DELETE]: '일기 삭제에 실패했어요',
  [ErrorContext.REPORT_GENERATE]: '리포트 생성에 실패했어요',
  [ErrorContext.REPORT_FETCH]: '리포트를 불러올 수 없어요',
  [ErrorContext.SYNC]: '서버 동기화에 실패했어요',
  [ErrorContext.PUSH_NOTIFICATION]: '알림 설정에 실패했어요',
  [ErrorContext.IMAGE_UPLOAD]: '이미지 업로드에 실패했어요',
  [ErrorContext.NETWORK]: '인터넷 연결을 확인해주세요',
  [ErrorContext.GENERAL]: '문제가 발생했어요',
};

/**
 * 일반적인 에러 메시지 패턴 매칭
 */
const COMMON_ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // 네트워크 관련
  { pattern: /network/i, message: '인터넷 연결을 확인해주세요' },
  { pattern: /offline/i, message: '오프라인 상태예요. 인터넷 연결을 확인해주세요' },
  { pattern: /connection/i, message: '서버에 연결할 수 없어요' },
  { pattern: /timeout/i, message: '요청 시간이 초과되었어요. 다시 시도해주세요' },

  // 인증 관련
  { pattern: /unauthorized|auth/i, message: '인증에 실패했어요. 다시 로그인해주세요' },
  { pattern: /forbidden/i, message: '권한이 없어요' },
  { pattern: /token/i, message: '인증 정보가 만료되었어요. 다시 로그인해주세요' },

  // 데이터 관련
  { pattern: /not found/i, message: '요청한 정보를 찾을 수 없어요' },
  { pattern: /already exists/i, message: '이미 존재하는 데이터예요' },
  { pattern: /invalid/i, message: '올바르지 않은 정보예요' },

  // 서버 관련
  { pattern: /server error|internal/i, message: '서버에 문제가 발생했어요' },
  { pattern: /service unavailable/i, message: '서비스를 일시적으로 사용할 수 없어요' },
  { pattern: /too many requests/i, message: '너무 많은 요청을 보냈어요. 잠시 후 다시 시도해주세요' },
];

/**
 * 에러 객체에서 상태 코드 추출
 */
function getStatusCode(error: any): number | null {
  return error?.response?.status || error?.status || null;
}

/**
 * 에러 객체에서 에러 코드 추출
 */
function getErrorCode(error: any): string | null {
  return error?.code || error?.response?.data?.code || null;
}

/**
 * 에러 객체에서 원본 메시지 추출
 */
function getOriginalMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    error?.toString() ||
    '알 수 없는 오류'
  );
}

/**
 * 네트워크 에러인지 확인
 */
function isNetworkError(error: any): boolean {
  const code = getErrorCode(error);
  if (code && (code === 'ERR_NETWORK' || code === 'ECONNREFUSED' || code === 'ENOTFOUND')) {
    return true;
  }

  const message = getOriginalMessage(error);
  return /network|offline|connection/i.test(message);
}

/**
 * 타임아웃 에러인지 확인
 */
function isTimeoutError(error: any): boolean {
  const code = getErrorCode(error);
  if (code && (code === 'ECONNABORTED' || code === 'ETIMEDOUT')) {
    return true;
  }

  const message = getOriginalMessage(error);
  return /timeout/i.test(message);
}

/**
 * 메인 함수: 에러를 사용자 친화적인 한글 메시지로 변환
 */
export function getLocalizedErrorMessage(
  error: any,
  context: ErrorContext = ErrorContext.GENERAL
): string {
  // 1. 네트워크 에러 우선 처리
  if (isNetworkError(error)) {
    const code = getErrorCode(error);
    if (code && NETWORK_ERROR_MESSAGES[code]) {
      return NETWORK_ERROR_MESSAGES[code];
    }
    return '인터넷 연결을 확인해주세요';
  }

  // 2. 타임아웃 에러 처리
  if (isTimeoutError(error)) {
    return '요청 시간이 초과되었어요. 다시 시도해주세요';
  }

  // 3. HTTP 상태 코드로 처리
  const statusCode = getStatusCode(error);
  if (statusCode && HTTP_STATUS_MESSAGES[statusCode]) {
    return HTTP_STATUS_MESSAGES[statusCode];
  }

  // 4. 에러 코드로 처리
  const errorCode = getErrorCode(error);
  if (errorCode && NETWORK_ERROR_MESSAGES[errorCode]) {
    return NETWORK_ERROR_MESSAGES[errorCode];
  }

  // 5. 원본 메시지 패턴 매칭
  const originalMessage = getOriginalMessage(error);
  for (const { pattern, message } of COMMON_ERROR_PATTERNS) {
    if (pattern.test(originalMessage)) {
      return message;
    }
  }

  // 6. 서버에서 보낸 한글 메시지가 있으면 그대로 사용
  if (error?.response?.data?.message && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(error.response.data.message)) {
    return error.response.data.message;
  }

  // 7. 컨텍스트별 기본 메시지 반환
  return CONTEXT_DEFAULT_MESSAGES[context];
}

/**
 * 네트워크 상태 확인 헬퍼 메시지
 */
export function getNetworkHelpMessage(): string {
  return '인터넷 연결을 확인하고 다시 시도해주세요.\n\n' +
         '• Wi-Fi 또는 모바일 데이터가 켜져 있는지 확인\n' +
         '• 비행기 모드가 꺼져 있는지 확인\n' +
         '• 다른 앱에서 인터넷이 되는지 확인';
}

/**
 * 재시도 가능 여부 판단
 */
export function isRetryableError(error: any): boolean {
  // 네트워크 에러는 재시도 가능
  if (isNetworkError(error)) {
    return true;
  }

  // 타임아웃 에러는 재시도 가능
  if (isTimeoutError(error)) {
    return true;
  }

  // 서버 에러 (5xx)는 재시도 가능
  const statusCode = getStatusCode(error);
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return true;
  }

  // 429 (Too Many Requests)도 재시도 가능 (잠시 후)
  if (statusCode === 429) {
    return true;
  }

  return false;
}

/**
 * 에러 심각도 판단
 */
export enum ErrorSeverity {
  INFO = 'info',      // 사용자가 해결 가능한 문제 (네트워크 끊김 등)
  WARNING = 'warning', // 재시도로 해결 가능한 문제
  ERROR = 'error',     // 사용자 액션이 필요한 문제
  CRITICAL = 'critical', // 개발자 개입이 필요한 문제
}

export function getErrorSeverity(error: any): ErrorSeverity {
  // 네트워크 에러는 INFO (사용자가 해결 가능)
  if (isNetworkError(error)) {
    return ErrorSeverity.INFO;
  }

  // 타임아웃이나 서버 에러는 WARNING (재시도 가능)
  if (isTimeoutError(error) || (getStatusCode(error) && getStatusCode(error)! >= 500)) {
    return ErrorSeverity.WARNING;
  }

  // 인증 에러는 ERROR (사용자 액션 필요)
  const statusCode = getStatusCode(error);
  if (statusCode === 401 || statusCode === 403) {
    return ErrorSeverity.ERROR;
  }

  // 기타
  return ErrorSeverity.ERROR;
}
